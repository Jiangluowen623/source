const PENDING = 'pending';
const FULFILLED = 'fulfilled';
const REJECTED = 'rejected';

/**
 * 解析promise的链式调用 
 * 如果 then 的返回值 x 是一个 promise，那么会等这个 promise 执行完，
 * promise 如果成功，就走下一个 then 的成功；
 * 如果失败，就走下一个 then 的失败；如果抛出异常，就走下一个 then 的失败；
 * 
 * 如果 then 的返回值 x 和 promise 是同一个引用对象，造成循环引用，
 * 则抛出异常，把异常传递给下一个 then 的失败的回调中；
 * 
 * 如果 then 的返回值 x 是一个 promise，且 x 同时调用 resolve 函数和 reject 函数，
 * 则第一次调用优先，其他所有调用被忽略；
 *
 * @param {*} promise2  返回新的promise
 * @param {*} x   then中返回的值
 * @param {*} resolve
 * @param {*} reject
 * @return {*} 
 */
function resolvePromise(promise2, x, resolve, reject) {
	//避免自己等待自己 循环引用
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
						//递归解析 promise中 可能包含promise
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

				// 如果 x 是个普通值就直接返回 resolve 作为结果
				resolve(x);
			}
		} catch (e) {
			if (called) return;

			called = true;

			reject(e);
		}
	} else {
		// 如果 x 是个普通值就直接返回 resolve 作为结果
		resolve(x);
	}
}

/**
 * 模拟实现Promise源码  符合Promise/A+规范.
 * new Promise时,需要传递一个executor函数，函数会立即执行.
 * promise包含三种状态  pending fulfulled rejected 初始状态为pening,只能从pening到 fulfilled，或者pending到rejected 。
 * promise状态一旦改变就不会 再改变。
 * executor接受2个参数，分别为resolve,reject . 
 * resolve 函数 接受一个成功的值，修改promise状态为 fuifilled 并顺序执行 成功回调函数集合。
 * reject 函数 接受一个失败的原因，修改promise状态为 rejected 并顺序执行 失败回调函数集合。
 * 
 * promise 包含then方法，then 接受2个参数,分别是promise 成功回调 onFulfilled,失败回调 onRejected.
 * 
 * 调用then函数时,
 * promise状态为fulfilled, 调用onFulfilled,并将promise的值传递进去。
 * promise状态为rejected, 调用onRejected ,并将失败的原因传递进去。
 * promise状态为pending, 需要将 onFulfilled onRejected 函数暂存，等待状态确认改变，再一次执行。(发布订阅模式)
 * 
 * promise.then 可以满足链式调用。则需要then函数返回另一个promise对象。
 * 如果then 返回的是一个结果，则把该结果作为参数 传递给下一个then的成功回调函数(onFulfilled)
 * 如果then 抛出了一个异常，则把该异常作为参数 传递给下一个then的失败回调函数(onRejected)
 * 如果then 返回是一个promise,那么会等待该promise执行完成,成功则调 下一个then的成功函数 (onFulfilled)，失败则调用下一个then的失败函数(onRejected)
 * 
 *
 * @class MyPromise
 */
class MyPromise {
	constructor(executor) {
		this.status = PENDING;
		this.value = null;
		this.reason = null;

		this.onFulfilledCallback = []; //成功的回调
		this.onRejectedCallback = []; // 失败的回调

		const resolve = (value) => {
			if (this.status === PENDING) {
				this.status = FULFILLED;
				this.value = value;
				this.onFulfilledCallback.forEach((fn) => fn());
			}
		};

		const reject = (reason) => {
			if (this.status === PENDING) {
				this.status = REJECTED;
				this.reason = reason;
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
		// 判断类型是否是函数
		onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : (value) => value;

		onRejected =
			typeof onRejected === 'function'
				? onRejected
				: (err) => {
						throw err;
					};
		//返回一个新的promise
		//这里模拟异步 setTimeout 为宏任务，原生promise为微任务。
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
						let x = onRejected(this.reason);
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
							let x = onRejected(this.reason);
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
	catch(onRejected) {
		return this.then(null, onRejected);
	}
}

MyPromise.resolve = (param) => {
	if (param instanceof MyPromise) {
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

MyPromise.reject = (reason) => {
	return new MyPromise((resolve, reject) => {
		reject(reason);
	});
};

// finally 无论如何都会执行。
MyPromise.finally = (callback) => {
	return this.then(
		(value) => {
			return Promise.resolve(callback()).then(() => value);
		},
		(reason) => {
			return Promise.resolve(callback()).then(() => {
				throw reason;
			});
		}
	);
};
// 等待多个promise执行结果，（如果有一个失败则失败）
MyPromise.all = (promises) => {
	if (!Array.isArray(promises)) {
		const type = typeof promises;
		return new TypeError(`TypeError: ${type} ${promises} is not iterable`);
	}

	return new MyPromise((resolve, reject) => {
		let result = [];
		let orderIndex = 0;

		const processResolve = (value, index) => {
			result[0] = value;
			//判断结果数量=promise数量 则resolve
			if (++orderIndex === promises.length) {
				resolve(result);
			}
		};
		promises.forEach((current, index) => {
			//判断current 是否是 promise
			if (current && typeof current.then === 'function') {
				//执行promise 解析
				current.then((value) => {
					processResolve(value, index);
				}, reject);
			} else {
				processResolve(current, index);
			}
		});
	});
};

// 处理多个promise ,采用最快的结果
MyPromise.race = (promises) => {
	return new MyPromise((resolve, reject) => {
		promises.forEach((current) => {
			//判断current 是否是 promise
			if (current && typeof current.then === 'function') {
				current.then(resolve, reject);
			} else {
				//普通值
				resolve(current);
			}
		});
	});
};

let a = new MyPromise((resolve, reject) => {
	resolve(1);
}).then((value) => {
	console.log(value);
});

let b = MyPromise.reject(1);

console.log(a, b);
