declare global {
	interface String {
		format(...args: (string | number)[]): string;
	}
}

String.prototype.format = function (...args: (string | number)[]): string {
	return this.replace(/{(\w+)}/g, (match, key) => args[Number(key)]?.toString() || match);
};
