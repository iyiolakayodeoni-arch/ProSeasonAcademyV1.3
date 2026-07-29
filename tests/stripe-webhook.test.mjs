// STRIPE WEBHOOK — signature verification and event routing.
//
// This gates paid access, so it is tested rather than trusted. Two parts:
//   1. the HMAC check accepts a genuine Stripe signature and rejects
//      forgeries, tampering, replays and malformed headers
//   2. the router grants ONLY on money actually moved — an unpaid or
//      merely-created session must never open a pass — and reads the
//      member's identity back out correctly, for every provider
//
// The logic here mirrors supabase/functions/pay-webhook/index.ts. If you
// change it there, change it here.
//
// Run:  node tests/stripe-webhook.test.mjs

globalThis.__p = 0; globalThis.__f = 0;

console.log('PART 1 · SIGNATURE VERIFICATION\n');
{
const enc = new TextEncoder();
async function hmacHex(hash, secret, body) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name:'HMAC', hash }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  return Array.from(new Uint8Array(sig)).map(b=>b.toString(16).padStart(2,'0')).join('');
}
const hmacSha256Hex = (s,b) => hmacHex('SHA-256', s, b);
function safeEqual(a,b){ if(a.length!==b.length) return false; let d=0; for(let i=0;i<a.length;i++) d|=a.charCodeAt(i)^b.charCodeAt(i); return d===0; }

async function verify(secret, header, raw, nowMs) {
  if (!secret) return false;
  const parts = new Map();
  for (const chunk of header.split(',')) {
    const [k,v] = chunk.split('=',2);
    if(!k||!v) continue;
    const key=k.trim();
    parts.set(key, [...(parts.get(key)??[]), v.trim()]);
  }
  const timestamp = parts.get('t')?.[0];
  const sent = parts.get('v1') ?? [];
  if (!timestamp || sent.length===0) return false;
  const age = Math.abs(nowMs/1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 300) return false;
  const expected = await hmacSha256Hex(secret, `${timestamp}.${raw}`);
  return sent.some(s=>safeEqual(expected,s));
}

const SECRET='whsec_test_abc123';
const raw = JSON.stringify({type:'checkout.session.completed',data:{object:{client_reference_id:'PSA-A1B2C3|NG-PRO-90',payment_status:'paid',payment_intent:'pi_123'}}});
const now = Date.now();
const t = Math.floor(now/1000);
const good = await hmacSha256Hex(SECRET, `${t}.${raw}`);

const cases = [
  ['genuine signature',                 `t=${t},v1=${good}`,                     raw, now,  true],
  ['rotated secret (2 v1, one valid)',  `t=${t},v1=deadbeef,v1=${good}`,          raw, now,  true],
  ['forged signature',                  `t=${t},v1=${'0'.repeat(64)}`,            raw, now,  false],
  ['tampered body',                     `t=${t},v1=${good}`, raw.replace('NG-PRO-90','NG-PRO-365'), now, false],
  ['replay, 10 min old',                `t=${t-600},v1=${good}`,                  raw, now,  false],
  ['no signature header',               ``,                                       raw, now,  false],
  ['missing timestamp',                 `v1=${good}`,                             raw, now,  false],
];
let pass=0, fail=0;
for (const [name, hdr, body, nw, want] of cases) {
  const got = await verify(SECRET, hdr, body, nw);
  const ok = got===want;
  ok?pass++:fail++;
  console.log(`${ok?'PASS':'FAIL'} · ${name.padEnd(34)} expected=${want} got=${got}`);
}

globalThis.__p += pass; globalThis.__f += fail;
}

console.log('\nPART 2 · EVENT ROUTING\n');
{
function decide(provider, body) {
  const event = String(body.event ?? body['event.type'] ?? '');
  const data = body.data ?? {};
  const status = String(data.status ?? '').toLowerCase();
  const eventType = String(body.event_type ?? body.type ?? '');
  const stripeObj = provider === 'stripe' ? (data.object ?? {}) : {};
  const stripePaid = provider==='stripe' &&
    (eventType==='checkout.session.completed' || eventType==='checkout.session.async_payment_succeeded') &&
    String(stripeObj.payment_status ?? '').toLowerCase()==='paid';
  const succeeded = stripePaid ||
    (provider==='paystack' && event==='charge.success') ||
    (provider==='flutterwave' && (status==='successful'||event==='charge.completed')) ||
    (provider==='paypal' && eventType==='PAYMENT.CAPTURE.COMPLETED');
  if(!succeeded) return {grant:false};
  const resource = body.resource ?? {};
  const custom = String(resource.custom_id ?? resource.invoice_id ?? '');
  const [ppA,ppP] = custom.includes('|') ? custom.split('|') : [custom,''];
  const sRef = String(stripeObj.client_reference_id ?? '');
  const [sA,sP] = sRef.includes('|') ? sRef.split('|') : [sRef,''];
  const sMeta = stripeObj.metadata ?? {};
  const meta = data.metadata ?? data.meta ?? {};
  return {
    grant:true,
    academyId:String(sA||sMeta.academy_id||ppA||meta.academy_id||'').toUpperCase().trim(),
    product:String(sP||sMeta.product||ppP||meta.product||'').toUpperCase().trim(),
    reference:String(stripeObj.payment_intent??stripeObj.id??resource.id??data.reference??data.id??''),
  };
}
const S=(o)=>({type:o.type,data:{object:o}});
const cases=[
 ['stripe paid session', 'stripe', S({type:'checkout.session.completed',client_reference_id:'PSA-A1B2C3|NG-PRO-90',payment_status:'paid',payment_intent:'pi_9',id:'cs_1'}), {grant:true,academyId:'PSA-A1B2C3',product:'NG-PRO-90',reference:'pi_9'}],
 ['stripe UNPAID session', 'stripe', S({type:'checkout.session.completed',client_reference_id:'PSA-X|NG-PRO-90',payment_status:'unpaid',id:'cs_2'}), {grant:false}],
 ['stripe session.created', 'stripe', S({type:'checkout.session.created',client_reference_id:'PSA-X|NG-PRO-90',payment_status:'paid',id:'cs_3'}), {grant:false}],
 ['stripe async succeeded', 'stripe', S({type:'checkout.session.async_payment_succeeded',client_reference_id:'PSA-B|WD-PRO-90',payment_status:'paid',payment_intent:'pi_7'}), {grant:true,academyId:'PSA-B',product:'WD-PRO-90',reference:'pi_7'}],
 ['stripe metadata fallback', 'stripe', S({type:'checkout.session.completed',payment_status:'paid',metadata:{academy_id:'PSA-C',product:'NG-MID-90'},id:'cs_5'}), {grant:true,academyId:'PSA-C',product:'NG-MID-90',reference:'cs_5'}],
 ['paypal still works','paypal',{event_type:'PAYMENT.CAPTURE.COMPLETED',resource:{custom_id:'PSA-D|NG-PRO-365',id:'CAP1'}},{grant:true,academyId:'PSA-D',product:'NG-PRO-365',reference:'CAP1'}],
 ['paystack still works','paystack',{event:'charge.success',data:{reference:'ref1',metadata:{academy_id:'PSA-E',product:'NG-MID-90'}}},{grant:true,academyId:'PSA-E',product:'NG-MID-90',reference:'ref1'}],
];
let p=0,f=0;
for(const [name,prov,body,want] of cases){
  const got=decide(prov,body);
  const ok=Object.entries(want).every(([k,v])=>got[k]===v);
  ok?p++:f++;
  console.log(`${ok?'PASS':'FAIL'} · ${name.padEnd(26)} ${ok?'':JSON.stringify(got)}`);
}

globalThis.__p += p; globalThis.__f += f;
}

console.log(`\n──────────────────────────────`);
console.log(`${globalThis.__p} passed · ${globalThis.__f} failed`);
process.exit(globalThis.__f ? 1 : 0);
