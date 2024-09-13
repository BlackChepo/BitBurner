import { PrepareServer, GainRootAccess,GetHosts, BestTarget, Multiscan, MaxElement, MsToTime, NumberWithCommas } from "utils.js";

/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("ALL");
  ns.clearLog();

  const loopDelay = 2000;
  const maxSleep = 5 * 60 * 1000;
  const idleSleep = 8000;

  const hack_script = "hackScript.js";
  const weaken_script = "weakenScript.js";
  const grow_script = "growScript.js";

  const hack_ram = ns.getScriptRam(hack_script);
  const weaken_ram = ns.getScriptRam(weaken_script);
  const grow_ram = ns.getScriptRam(grow_script);
  
  const scannedServers = Multiscan(ns, 'home');

  const bestTargets = BestTarget(ns, scannedServers); //"joesguns";
  const hosts = GetHosts(ns, scannedServers);

  // Kill arg
  if (ns.args[0] == "kill")  {
    Kill(ns, hosts, [hack_script, weaken_script, grow_script]);    
    Kill(ns, hosts, ["hackmanager.js"]);
    return;
  }

  // Instance check
  HackManagerRunning(ns, scannedServers);

  // Start Manager  
  var sleepTime = 0;

  // Loop
  var run = 1;
  var targetId = 0;
  while(true)
  {
    var target = bestTargets[targetId];

    const minSecurityLevel = ns.getServerMinSecurityLevel(target);  
    var singleThreadWeakenRate = ns.weakenAnalyze(1,1);
    var maxMoney = ns.getServerMaxMoney(target);
    var singleThreadHackRate = ns.hackAnalyze(target);

    let currentSecurityLevel = ns.getServerSecurityLevel(target);
    var weakenThreads = Math.floor((currentSecurityLevel - minSecurityLevel) / singleThreadWeakenRate);
    var availableHostsRam = 0;
    hosts.forEach(h => {
      availableHostsRam += ns.getServerMaxRam(h) - ns.getServerUsedRam(h);
    });
    var currentMoney = ns.getServerMoneyAvailable(target);
    var growDoubleTimes = 2.0;
    if (isFinite(currentMoney)){
      growDoubleTimes = (Math.log((maxMoney/ currentMoney)) / Math.log(2)).toFixed(3) * 2;
    }
    var growThreads = 0;
    // ns.print("growDoubleTimes: " + growDoubleTimes);
    if (isFinite(growDoubleTimes) && growDoubleTimes >= 1.0){      
      growThreads = Math.ceil(ns.growthAnalyze(target, growDoubleTimes));
    } else {
      growThreads = 10;
    }
      
    var weakenTime = ns.getWeakenTime(target); 
    var weakenEndTime = Date.now() + weakenTime; 
    var growTime = ns.getGrowTime(target);
    var growEndTime = Date.now() + growTime;  
    var hackTime = ns.getHackTime(target);
    var hackEndTime = Date.now() + hackTime;      

    var neededWeakenRam = (weaken_ram * weakenThreads).toFixed(2);
    var neededGrowRam = (grow_ram * growThreads).toFixed(2);
    var hackRamLeft = (availableHostsRam - neededGrowRam - neededWeakenRam).toFixed(2);
    var possibleHackThreads = 0;
    if (hackRamLeft < 0){
      hackRamLeft = 0;
    } else {
      possibleHackThreads = Math.floor( hackRamLeft / hack_ram);
    }

    LogLine(ns, "=================================================")
    LogLine(ns, "====== RUN: " + run);
    LogLine(ns, "=================================================")
    LogLine(ns, `Target:   ${target}`)
    LogLine(ns, `Security: ${minSecurityLevel}/${currentSecurityLevel.toFixed(2)}`)
    LogLine(ns, `Money:    ${NumberWithCommas(maxMoney)}/${NumberWithCommas(Math.round(currentMoney))}`)
    LogLine(ns, `Weaken:   Threads: ${weakenThreads} | Duration: ${MsToTime(weakenTime)}`)
    LogLine(ns, `Grow:     Threads: ${growThreads} | Duration: ${MsToTime(growTime)}`)
    LogLine(ns, "====== HOSTS: " + hosts.length)
    LogLine(ns, `Available ram:         ${availableHostsRam.toFixed(2)} gb`)
    LogLine(ns, `Needed weaken ram:     ${neededWeakenRam} gb`)
    LogLine(ns, `Needed grow ram:       ${neededGrowRam} gb`)
    LogLine(ns, `Free hack ram:         ${hackRamLeft} gb`)
    LogLine(ns, `possible hackthreads:  ${possibleHackThreads}`)  

    var halfCurrency = maxMoney / 2;        
    var threadsToMid = 0;
    if (currentMoney > halfCurrency){
      var currencyToMid = Math.ceil(currentMoney - halfCurrency);
      threadsToMid = Math.ceil(ns.hackAnalyzeThreads(target, currencyToMid));   
    }

    var hackThreadsLeft = threadsToMid;
    var weakenThreadsLeft = weakenThreads;
    var growThreadsLeft = growThreads;

    var runningHackScripts = GetRunningScripts(ns, hosts, hack_script, target);
    var runningWeakenScripts = GetRunningScripts(ns, hosts, weaken_script, target);
    var runningGrowScripts = GetRunningScripts(ns, hosts, grow_script, target);

    // Get still running Threads
    runningHackScripts.forEach(p => hackThreadsLeft -= p.threads);
    runningWeakenScripts.forEach(p => weakenThreadsLeft -= p.threads);
    runningGrowScripts.forEach(p => growThreadsLeft -= p.threads);

    var startedWeakenThreads = 0;
    var startedGrowThreads = 0;
    var startedHackThreads = 0;

      
    // Start Threads  
    hosts.forEach(h => {
      if (weakenThreadsLeft > 0){        
        var tempwt = StartScriptOnHost(ns, weaken_script, weaken_ram, h, target, weakenThreadsLeft, weakenTime, singleThreadWeakenRate);
        weakenThreadsLeft -= tempwt;
        startedWeakenThreads += tempwt;
      }
      if (weakenThreadsLeft <= 0 && growThreadsLeft > 0){
        var tempgt = StartScriptOnHost(ns, grow_script, grow_ram, h, target, growThreadsLeft, growTime, singleThreadHackRate);
        growThreadsLeft -= tempgt;
        startedGrowThreads += tempgt;
      }
      if (growThreadsLeft <= 0 && hackThreadsLeft > 0){                          
          var tempht = StartScriptOnHost(ns, hack_script, hack_ram, h, target, hackThreadsLeft, hackTime, ((maxMoney - currentMoney) / growThreads));
          hackThreadsLeft -= tempht;
          startedHackThreads += tempht;          
        }              
    });

    LogLine(ns, "====== STARTED THREADS: " + (startedWeakenThreads + startedGrowThreads + startedHackThreads))
    LogLine(ns, `Weaken Threads: ${startedWeakenThreads}`)
    LogLine(ns, `Grow   Threads: ${startedGrowThreads}`)
    LogLine(ns, `Hack   Threads: ${startedHackThreads}`)

    var runTime = 0;
    if (startedWeakenThreads > 0) {runTime = weakenTime;}
    if (startedGrowThreads > 0 && growTime < runTime){runTime = growTime;}
    if (startedHackThreads > 0 && hackTime < runTime){runTime = hackTime;}  
    if (runTime <= 0) {runTime = idleSleep;}
    else if (runTime > maxSleep) {runTime = maxSleep;}
    var runEndTime = Date.now() + loopDelay + runTime;
    run += 1;
    LogLine(ns, "=================================================")
    LogLine(ns, `====== RUN END AT:   ${new Date(runEndTime).toLocaleTimeString()}`)
    LogLine(ns, "=================================================")    

    var localSleepTime = Math.ceil(loopDelay + runTime);
    if (sleepTime == 0){
      sleepTime = localSleepTime;
    } else if (localSleepTime < sleepTime){
      sleepTime = localSleepTime;
    }
    
    targetId += 1;
    // Erst schlafen, wenn kaum noch ram übrig ist, oder kein Target mehr übrig ist.
    if ((availableHostsRam - 50) <= 0 || targetId >= bestTargets.length) 
    {
      // Sleep to next run;
      ns.print("Sleep: " + sleepTime)
      await ns.sleep(sleepTime);
      sleepTime = 0;
      targetId = 0;
    }
  }
  return;
}

/** @param {NS} ns */
function LogLine(ns, line){
  // ns.printf(line);
  // ns.write("log.txt", line + "\n", "a");
}

function HackManagerRunning(ns, hosts){
  const script = "hackmanager.js";
  var runningScripts = [];
  hosts.forEach(h => 
  {
    var hostScripts = ns.ps(h);
    hostScripts.forEach(p => 
    {
      if (p.filename == script){        
        runningScripts.push(p);      
      }
    });
  });

  if (runningScripts.length > 1)
    throw new Error("Only one Instance allowed.");
}

function GetRunningScripts(ns, hosts, script, target){
  var scripts = [];
  hosts.forEach(h => 
  {
    var hostScripts = ns.ps(h);
    hostScripts.forEach(p => 
    {
      if (p.filename == script){        
        if (p.args[0] == target){
            scripts.push(p);
        }        
      }
    });
  });
  return scripts;
}

function Kill(ns, hosts, scripts)
{
  hosts.forEach(h => 
  {
    scripts.forEach(s => {
      if (ns.scriptRunning(s, h)){
        ns.scriptKill(s,h);
      }
    });
  });
}



function StartScriptOnHost(ns, script, scriptRam, host, target, wantedThreads, estimatedTime, outcomeValue)
{
  if (wantedThreads < 0){
    return 0;
  }

  if(host != "home")
  {
    if (ns.fileExists(script, host)) {
        ns.rm(script, host);
    }
    ns.scp(script, host);
  }

  var possibleThreads = Math.floor((ns.getServerMaxRam(host) - ns.getServerUsedRam(host)) / scriptRam);
  var startThreads = 0;
  if (possibleThreads >= wantedThreads){
    startThreads = wantedThreads;
  } else {
    startThreads = possibleThreads;
  }
  if (startThreads > 0){
    ns.exec(script, host, startThreads, target, Date.now(), estimatedTime, outcomeValue * startThreads);    
  }

  return startThreads;
}