/** @param {NS} ns */
export function MaxElement(arr) {
	let max = 0;
	for (let i = 0; i < arr.length; i++) {
		if (arr[i] > max) {
			max = arr[i]
		}
	}

	let maxE = arr.indexOf(max);
	return maxE
}

export function GetHosts(ns, scannedServers)
{
  var hosts = [];
  hosts.push("home");
  ns.getPurchasedServers().forEach(o => {
    if(hosts.indexOf(o) === -1) {hosts.push(o);}
  });
  
  scannedServers.forEach((s) => 
  {
    if (ns.hasRootAccess(s)){
      if(hosts.indexOf(s) === -1) {hosts.push(s);}
    }
    else if (GainRootAccess(ns, s)){
      if(hosts.indexOf(s) === -1) {hosts.push(s);}
    }
  });
  
  return hosts;
}

export function MsToTime(s) {
  var ms = s % 1000;
  s = (s - ms) / 1000;
  var secs = s % 60;
  s = (s - secs) / 60;
  var mins = s % 60;
  var hrs = (s - mins) / 60;

  return hrs + ':' + mins + ':' + secs;// + '.' + ms;
}

export function NumberWithCommas(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function BestTarget(ns, arr) {
	let list = [];
	let results = [];
	arr.forEach(server => {
		if (!ns.hasRootAccess(server)) {
			GainRootAccess(ns, server);
		}

		if (ns.hasRootAccess(server) && ns.getServerRequiredHackingLevel(server) <= ns.getHackingLevel() && server != 'home' && !ns.getPurchasedServers().includes(server) && ns.getServerMoneyAvailable(server)) {
			list.push(server);
		}
	})

	// Fav Server push, when rdy
  // const favServer = "joesguns";
  // if (!ns.hasRootAccess(favServer)) {
  //   GainRootAccess(ns, favServer)
  // }
  // if (ns.hasRootAccess(favServer) && ns.getServerRequiredHackingLevel(favServer) <= ns.getHackingLevel()){
  //   results.push(favServer);
  // }
  

  // list.sort((a,b) => ns.getServerMaxMoney(b)-ns.getServerMaxMoney(a)).slice(0,20).forEach(p => {
  //   // if (p != favServer)
  //      results.push(p)
  // });

  list.sort((a,b) => ns.getServerMaxMoney(a)-ns.getServerMaxMoney(b)).slice(0,30).forEach(p => {
    // if (p != favServer)
       results.push(p)
  });

  return results;
}

export function PrepareServer(ns, target, script)
{
  if (ns.fileExists(script, target)) {
      ns.rm(script, target);
  }
  ns.scp(script, target);
}

export function GainRootAccess(ns, server)
{
  let possiblePorts = 0;
  if (ns.fileExists("BruteSSH.exe", "home")) {
      possiblePorts += 1;
  }
  if (ns.fileExists("FTPCrack.exe", "home")) {
      possiblePorts += 1;
  }
  if (ns.fileExists("HTTPWorm.exe", "home")) {
      possiblePorts += 1;
  }
  if (ns.fileExists("relaySMTP.exe", "home")) {
      possiblePorts += 1;
  }
  if (ns.fileExists("SQLInject.exe", "home")) {
      possiblePorts += 1;
  }

  if (ns.getServerNumPortsRequired(server) <= possiblePorts)
  {
    if (ns.fileExists('brutessh.exe')) {
		ns.brutessh(server);
    }
    if (ns.fileExists('ftpcrack.exe')) {
      ns.ftpcrack(server);
    }
    if (ns.fileExists('relaysmtp.exe')) {
      ns.relaysmtp(server);
    }
    if (ns.fileExists('httpworm.exe')) {
      ns.httpworm(server);
    }
    if (ns.fileExists('sqlinject.exe')) {
      ns.sqlinject(server);
    }
    
    ns.nuke(server);

    
    return true;    
  }
  return false;
}

export function Multiscan(ns, server) {
	let serverList = [];
	function scanning(server) {
		let currentScan = ns.scan(server);
		currentScan.forEach(server => {
			if (!serverList.includes(server)) {
				serverList.push(server);
				scanning(server);
			}
		})
	}
	scanning(server);
	return serverList;
}