const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

function resolvePromise(promise2, x, resolve, reject) {
	if (promise2 === x) {
		return reject(new TypeError('Chaining cycle detected for promise'));
	}

	if (x && (typeof x === 'object' || typeof x === 'function')) {
		//防止重复调用
		let called;

		try {
			// A+规定，声明then = x的then方法
			let then = x.then;
			// 如果then是函数，就默认是promise了
			if (typeof then === 'function') {
				then.call(
					x,
					(y) => {
						if (called) return;

						called = true;

						resolvePromise(promise2, y, resolve, reject);
					},
					(err) => {
						// 成功和失败只能调用一个
						if (called) return;
						called = true;
						reject(err); // 失败了就失败了
					}
				);
			} else {
				if (called) return;

				called = true;

				resolve(x);
			}
		} catch (e) {
			if (called) return;

			called = true;

			reject(e);
		}
	} else {
		resolve(x);
	}
}

class MyPromise {
	constructor(executor) {
		this.status = PENDING;
		this.value = null;
		this.reson = null;

		this.onFulfilledCallback = []; //成功的回调
		this.onRejectedCallback = []; // 失败的回调

		const resolve = (value) => {
			if (this.status === PENDING) {
				this.status = FULFILLED;
				this.value = value;
				this.onFulfilledCallback.forEach((fn) => fn());
			}
		};

		const reject = (reson) => {
			if (this.status === PENDING) {
				this.status = REJECTED;
				this.reson = reson;
				this.onRejectedCallback.forEach((fn) => fn());
			}
		};

		try {
			executor(resolve, reject);
		} catch (ex) {
			reject(ex);
		}
	}

	then(onFulfilled = () => {}, onRejected = () => {}) {
		onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : (value) => value;

		onRejected =
			typeof onRejected === 'function'
				? onRejected
				: (err) => {
						throw err;
					};

		let promise2 = new MyPromise((resolve, reject) => {
			if (this.status === FULFILLED) {
				setTimeout(() => {
					try {
						let x = onFulfilled(this.value);

						resolvePromise(promise2, x, resolve, reject);
					} catch (e) {
						reject(e);
					}
				}, 0);
			} else if (this.status === REJECTED) {
				setTimeout(() => {
					try {
						let x = onRejected(this.reson);
						resolvePromise(promise2, x, resolve, reject);
					} catch (e) {
						reject(e);
					}
				}, 0);
			} else if (this.status === PENDING) {
				this.onFulfilledCallback.push(() => {
					setTimeout(() => {
						try {
							let x = onFulfilled(this.value);

							resolvePromise(promise2, x, resolve, reject);
						} catch (e) {
							reject(e);
						}
					}, 0);
				});

				this.onRejectedCallback.push(() => {
					setTimeout(() => {
						try {
							let x = onRejected(this.reson);
							resolvePromise(promise2, x, resolve, reject);
						} catch (e) {
							reject(e);
						}
					}, 0);
				});
			}
		});

		return promise2;
	}
}

MyPromise.prototype.resolve = (param) => {
	if (param instanceof Promise) {
		return param;
	}
	return new MyPromise((resolve, reject) => {
		if (param && typeof param === 'object' && typeof param.then === 'function') {
			setTimeout(() => {
				param.then(resolve, reject);
			});
		} else {
			resolve(param);
		}
	});
};

let a = new MyPromise((resolve, reject) => {
	resolve(1);
}).then((value) => {
	console.log(value);
});

console.log(a);
