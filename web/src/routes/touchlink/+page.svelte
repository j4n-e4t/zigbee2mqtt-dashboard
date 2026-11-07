<script lang="ts">
 import PageShell from '#lib/components/page-shell.svelte';
 import HaCard from '#lib/components/ha-card.svelte';
 import {z2m} from '#lib/z2m/store.svelte.js';
 import {confirm,run} from '#lib/ui.svelte.js';
 type Target={ieee_address:string;channel:number};
 let found=$state<Target[]>([]), busy=$state(false), scanned=$state(false), serials=$state(''), pan=$state('');
 async function scan(){busy=true;found=[];const result=await run(()=>z2m.request<{found:Target[]}>('touchlink/scan',{}, {timeoutMs:180_000}),'Scan completed');if(result){found=result.found;scanned=true;}busy=false;}
 async function target(op:string,d?:Target){
  if(op==='factory_reset'&&!await confirm({title:'Factory reset through Touchlink?',text:d?`Reset ${d.ieee_address} and remove it from its current network.`:'Reset the first nearby device found. It will leave its current network.',confirmText:'Factory reset',destructive:true}))return;
  busy=true;await run(()=>z2m.request(`touchlink/${op}`,d?{...d}:{},{timeoutMs:180_000}),'Touchlink request completed');busy=false;
 }
 async function hue(){
  if(!await confirm({title:'Factory reset Hue devices?',text:'The listed lights will leave their current network.',confirmText:'Factory reset',destructive:true}))return;
  busy=true;await run(()=>z2m.request('action',{action:'philips_hue_factory_reset',params:{...(pan?{extended_pan_id:pan}:{}),serial_numbers:serials.split(',').map(s=>s.trim())}},{timeoutMs:180_000}),'Hue reset completed');busy=false;
 }
 const validSerials=$derived(serials.split(',').every(s=>/^[a-fA-F0-9]{6}$/.test(s.trim())));
</script>
<PageShell>
 <h1 class="m-0 mb-4 text-2xl font-normal">Touchlink</h1><div class="grid gap-4">
 <HaCard header="Touchlink">
  <p class="m-0 mb-4 text-muted-foreground">Place the target device close to the coordinator. A scan can take a few minutes.</p>
  <div class="flex flex-wrap gap-2"><button class="ha-button" disabled={busy} onclick={scan}>{busy?'Working…':'Scan nearby devices'}</button><button class="ha-button" data-variant="danger" disabled={busy} onclick={()=>target('factory_reset')}>Reset first nearby device</button></div>
  {#each found as d (`${d.ieee_address}/${d.channel}`)}<div class="flex flex-wrap items-center gap-3 mt-4"><span class="flex-1">{d.ieee_address} · channel {d.channel}</span><button class="ha-button" disabled={busy} onclick={()=>target('identify',d)}>Identify</button><button class="ha-button" data-variant="danger" disabled={busy} onclick={()=>target('factory_reset',d)}>Factory reset</button></div>{:else}{#if scanned}<p>No Touchlink devices found nearby.</p>{/if}{/each}
 </HaCard>
 <HaCard header="Philips Hue factory reset">
  <form class="grid gap-3" onsubmit={e=>{e.preventDefault();void hue();}}>
   <label class="grid gap-1">Serial numbers (comma separated)<input class="ha-input" bind:value={serials} placeholder="a1b2c3, d4e5f6" required/></label>
   <label class="grid gap-1">Extended PAN ID (optional)<input class="ha-input" bind:value={pan} pattern="0x[a-fA-F0-9]{16}" placeholder="0x0123456789abcdef"/></label>
   <button class="ha-button justify-self-start" data-variant="danger" disabled={busy||!validSerials}>Factory reset Hue devices</button>
  </form>
 </HaCard>
</div></PageShell>
