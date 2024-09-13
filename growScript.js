/** @param {NS} ns */
export async function main(ns, target = ns.args[0]) {
	await ns.grow(target);
}