import { PrepareServer, GainRootAccess, GetHosts, BestTarget, Multiscan, MaxElement, MsToTime, NumberWithCommas } from "utils.js";

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");
  ns.print("starting...");  
  
  ns.tail(ns.pid);
  ns.resizeTail(1500, 900, ns.pid);
  ns.moveTail(250, 0, ns.pid);
  // scripts
  const hack_script = "hackScript.js";
  const weaken_script = "weakenScript.js";
  const grow_script = "growScript.js";
  const manager_script = "hackmanager.js";

  const hack_ram = ns.getScriptRam(hack_script);
  const weaken_ram = ns.getScriptRam(weaken_script);
  const grow_ram = ns.getScriptRam(grow_script);

  while(true){
    const scannedServers = Multiscan(ns, 'home');
    const hosts = GetHosts(ns, scannedServers);

    let id = 1;
    const targets = [];
    BestTarget(ns, scannedServers).forEach(p => {    
      var t = {};
      t.name = p;
      t.priority = id;
      t.hacks = 0;
      t.grows = 0;
      t.weakens = 0;
      t.money = NumberWithCommas(ns.getServerMaxMoney(p)) + "/" + NumberWithCommas(Math.floor(ns.getServerMoneyAvailable(p)));       
      targets.push(t);
      id += 1;
    })

    var usedRam = 0;
    var maxRam = GetHostRam(ns, hosts);

    var endTime = NaN;
    var scripts = GetRunningScripts(ns, hosts);
    targets.forEach(t => 
    {
      scripts.forEach(s => {
        if (s.args[0] == t.name)
        {
          let _continue = true;
          if (s.filename == hack_script){
            t.hacks += s.threads; 
            usedRam += (hack_ram * s.threads);           
          } else if (s.filename == grow_script){
            t.grows += s.threads;
            usedRam += (grow_ram * s.threads);
          } else if (s.filename == weaken_script){
            t.weakens += s.threads;
            usedRam += (weaken_ram * s.threads);
          } else {            
            _continue = false;
          }

          if (_continue)
          {
            var tempTime = Math.floor(s.args[1] + s.args[2]);
            if (isNaN(endTime) || endTime > tempTime) {              
              endTime = tempTime;
            }
              
          }
        }
      });    
    });
    
    var sleepTime = endTime - Date.now();
    if (isNaN(sleepTime) || sleepTime < 1000)
      sleepTime = 1000;
    else if (sleepTime > 5000)
      sleepTime = 5000;

    ns.clearLog();  
    ns.printf(`Ram: ${NumberWithCommas(maxRam)}/${NumberWithCommas(Math.floor(usedRam))} `)  
    PrintLine(ns);
    PrintRow(ns, ["Target", "Money", "Hacks", "Weakens", "Grows"]);
    PrintLine(ns);
    targets.forEach(p => {
      PrintRow(ns, [p.name, p.money, p.hacks, p.weakens, p.grows]);
    });
    PrintLine(ns);
    ns.print("Sleep: " + sleepTime);
    await ns.sleep(sleepTime)
  }
}

const tableWidth = 152;
/** @param {NS} ns */
function PrintLine(ns)
{
  var char = "—";
  let line = StringPlace(char, tableWidth);    
  ns.print(line)
}

function StringPlace(char, times)
{
  let line = "";
  for(let i = 0; i < times; i ++)
    line += char;
  return line;
}

/** @param {NS} ns */
function PrintRow(ns, columns)
{
    let width = (tableWidth - columns.length) / columns.length;
    let row = "|";
    for (let i = 0; i < columns.length; i++)
    {
      
        row += AlignCentre(columns[i], width) + "|";
    }

    ns.print(row);
}

function AlignCentre(text, width)
{
    text = String(text);
    text = text.Length > width ? text.substring(0, width - 3) + "..." : text;

    if (text == NaN || text == "")
    {
        return StringPlace(" ", width);
    }
    else
    {
        return text.padStart(width - (width - text.length) / 2).padEnd(width);
    }
}
/** @param {NS} ns */
function GetRunningScripts(ns, hosts)
{
  var scripts = [];
  hosts.forEach(h => 
  {
    var hostScripts = ns.ps(h);
    hostScripts.forEach(p => scripts.push(p));
  });
  return scripts;
}

/** @param {NS} ns */
function GetHostRam(ns, hosts){
  var ram = 0;
  hosts.forEach(h => {
      ram += ns.getServerMaxRam(h);
    });
  return ram;
}
