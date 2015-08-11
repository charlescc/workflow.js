	(function() {

		var root_index = []; //root索引
		var current_index = []; //多叉树的叶子索引的index_process对象数组
		var exec_count = 0;
		var MAX_EXEC = 1000;

		//var exec_current;
		var index = 0;
		var index_process_tosource = []; //index_process数组
		var process_tosource = []; //process数组
		var index_process = function() {
			var _id = 0;
			var _after = [];
			this._setId = function(index) {
				_id = index;
			}
			this._getId = function() {
				return _id;
			}
			this._chain = function(afters) {
				if (afters instanceof index_process)
					_after.push(afters);
				else if (afters instanceof Array && afters.length > 0)
					_after = _after.concat(afters);
				else
					throw new Error('invalid afters process_index');
			}
			this._getAfters = function() {

				return _after;
			}
		}
		var process = function() {
			var _params = [];
			var _after = []; //process对象数组
			var _id;
			var _operation;
			var _checkpoints = [];
			var progress = 'loaded';
			this.setProgress = function(str) {

				progress = str;
			}
			this.getProgress = function() {

				return progress;
			}
			this.getId = function() {

				return _id;
			}
			this.setId = function(id) {
				if (isNaN(id)) throw new Error('process id isNaN');
				_id = Number(id);
			}
			this.setParams = function(inputParams, clean) {
				if (clean) _params = []; //clean模式表示清空
				if (inputParams instanceof Array) {
					_params.concat(inputParams);
				} else {
					_params.push(inputParams);
				}
			}
			this.getParams = function() {
				return _params;
			}
			this.setOp = function(func) {
				_operation = func;
			}
			this.getOp = function(func) {
				return _operation;
			}
			this.setCk = function(func, clean) {
				if (clean) {
					_checkpoints = [];
					_checkpoints.push(func);
				} else {
					_checkpoints.push(func);
				}
			}
			this.getCk = function() {
				return _checkpoints;
			}
		}

		var getIndexProcessById = function(Id) {
			for (var i = 0; i < index_process_tosource.length; i++) {
				if (index_process_tosource[i]._getId() === Id) {
					return index_process_tosource[i];
				}
			}
			return;
		}
		var getProcessByIndexProcess = function(index_process) {
			if (typeof process_tosource[index_process._getId()] == 'undefined') throw new Error('find no process coresponding to index_process');
			return process_tosource[index_process._getId()];
		}
		var getProcessById = function(process_id) {
			var index_process = getIndexProcessById(process_id);
			if (!index_process) {
				throw new Error('require a valid  tree-foot process id');
			} else {
				return getProcessByIndexProcess(index_process);
			}
		}
		var validProcessId = function(Id) {
			for (var i = 0; i < index_process_tosource.length; i++) { //只要是已存在的节点就能加
				var temp_id = index_process_tosource[i]._getId();
				if ((temp_id === Id) || (String(temp_id) === Id)) {
					return true;
				}
			}

			return false;
		}

		var root = this;
		var _ = function(obj) {
			if (obj instanceof _) return obj;
			else if (!(this instanceof _)) return new workflow(obj);

			this._warpped = obj;
		}

		/**
		 * 通用模块化定义
		 * @type {[type]}
		 */
		if (typeof exports !== 'undefined') {
			if (typeof module !== 'undefined' && module.exports) {
				exports = module.exports = _;
			} else {
				exports.workflow = _;
			}
		} else if (typeof define == 'function' && define.amd) {
			define('workflow', [], function() {
				return _;
			});

		} else {
			root.workflow = _;
		}

		_.initFlowMax = function(max) {
			if(!isNaN(max)&&max>=1)
				MAX_EXEC = max;
		}
		_.add = function(inputParams, father_id) {

			if (typeof father_id != 'undefined' && !validProcessId(father_id)) //检测process_id是否合法
				throw new Error('require a valid  tree-foot process id to  addProcedure');

			var temp_process = new process();
			var temp_index = new index_process();
			temp_process.setParams(inputParams);
			temp_process.setId(index);
			temp_index._setId(index);
			index_process_tosource.push(temp_index); //树结构添加到数组index_process_tosource
			var return_id = index;
			index++;
			process_tosource.push(temp_process);

			if (typeof father_id == 'undefined') { //添加到root_index
				root_index.push(temp_index);
			} else {
				var process_index = getIndexProcessById(father_id);
				if (!process_index) throw new Error('require a valid process id to  addProcedure');
				process_index._chain(temp_index);
			}
			return return_id;
		}
		_.modify = function(inputParams, checkpoint, process_id, add) {
			var current_process = getProcessById(process_id);
			if (!current_process) return;
			current_process.setParams(inputParams, add ? undefined : 1);
			current_process.setCk(checkpoint, add ? undefined : 1);
			current_process.setProgress('loaded');
			console.log('步骤' + process_id + '已更改完成');

		}
		var executeSingle = function(currentProcessIndex, pass, callback) {
			var singleProcess = getProcessByIndexProcess(currentProcessIndex);
			var inputs = singleProcess.getParams();
			var Op = singleProcess.getOp();
			if (typeof Op == 'undefined') throw new Error('步骤' + currentProcessIndex._getId() + '未注入Operation,workflow终止于该步骤');
			exec_count++;
			Op(inputs, function(state, pass, ck_input, showResult) {
				if (state == 'failed') {
					console.log('Op处理回调返回失败，终止于步骤' + currentProcessIndex._getId());
					singleProcess.setProgress('unpassed');
				} else if (state == 'success') {
					var Cks = singleProcess.getCk();
					var Cks_checked = true;
					var checked_flag = true;

					for (var x = 0; x < Cks.length; x++) { //get Ck's funcs
						if (!Cks[x](ck_input)) {
							console.log('checkpoint[' + x + ']失败');
							checked_flag = false;
							//callback(currentProcessIndex._getId(),pass);

						}
					}
					if (!checked_flag) {
						console.log('停止于步骤' + currentProcessIndex._getId());
						singleProcess.setProgress('unchecked');
					} else singleProcess.setProgress('checked');
				}
				callback(currentProcessIndex._getId(), singleProcess.getProgress(), pass, showResult);
				return;
			}, pass);
		}

		var executeAll = function(currentIndexArray, pass, callback, num, father_process_id) {
			num = num ? num : 1; //记录属于第几步
			if (typeof currentIndexArray == 'undefined') {
				currentIndexArray = [];
				currentIndexArray = currentIndexArray.concat(root_index);
			}
			if (currentIndexArray.length == 0) { //运行完步骤流
				console.log('执行完以步骤' + father_process_id + '结尾步骤流');
				return;
			}

			while (exec_count + currentIndexArray.length >= MAX_EXEC) {
				setTimeout(function() {}, 500);
				console.log('流量控制，等待一轮。');
			}
			for (var i = 0; i < currentIndexArray.length; i++) {
				var before = new Date();
				(function(index, start) {
					console.log('步骤' + num + '---兄弟' + index + ':');
					executeSingle(currentIndexArray[index], pass, function(id, state, pass, showResult) {
						var now = new Date();
						if(typeof callback =='func'){
							callback(id, state, now - start, showResult);
						}
						exec_count--;
						if (state == 'checked') {
							executeAll(currentIndexArray[index]._getAfters(), pass, callback, num + 1, id);
						}

					});
				})(i, before);
				//arguments.callee(currentIndexArray[i]._getAfters(), callback);

			}

		}
		_.execute = function(process_id, pass, callback) {
			if (typeof process_id == 'undefined') { //默认从root开始
				executeAll(undefined, undefined, callback);
			} else {
				var current_index = getIndexProcessById(process_id);
				if (typeof current_index == 'undefined') {
					throw new Error('execute process id invalid');
				}
				var current_process_index = [];
				current_process_index.push(current_index);
				executeAll(current_process_index, pass, callback);
			}
		}

		_.injectOp = function(func, process_id) {
			var current_process = getProcessById(process_id);
			if (!current_process) return false;
			if (typeof func == 'function') {
				current_process.setOp(func);
				return true;
			} else {
				return false;
			}
		}

		_.injectCk = function(func, process_id) {
			var current_process = getProcessById(process_id);
			if (!current_process) return false;
			if (typeof func == 'function') {
				current_process.setCk(func);
				return true;
			} else {
				return false;
			}
		}

		_.reset = function() {
			for (var i = 0; i < process_tosource.length; i++) {
				if (process_tosource[i].getProgress() !== 'loaded') {
					var execute_flag = true;
				}
				if (process_tosource[i].getProgress() === 'loaded') {
					var loaded_flag = true;
				}
				if ((execute_flag) && (loaded_flag)) {
					throw new Error('can not clean executing procedure');
					return;
				}
			}

			root_index = []; //root索引
			//current_index = []; //多叉树的叶子索引的index_process对象数组
			exec_count = 0;
			index = 0;
			MAX_EXEC = 1000;
			index_process_tosource = []; //index_process数组
			process_tosource = [];
			console.log('workflow cleaned,ready to use');
		}
		_.getProcessProgress = function(process_id) {
			if(isNaN(process_id)) return false;
			var current_index = getIndexProcessById(process_id);
			if(!current_index) return false;
			var current_process = getProcessByIndexProcess(current_index);
			return (current_process.getProgress());
		}
		_.list = function(input_func_array, root_id) {
			var result_id = [];
			var self = this;
			var father_id=root_id;
			for (var i = 0; i < input_func_array.length; i++) {
				var input = input_func_array[i][0];
				var func = input_func_array[i][1];
				if (typeof input == 'function' || typeof func != 'function') throw new Error('list input invalid array');

				var current_id = self.add(input, father_id);
				//self.injectCk();
				if (isNaN(current_id)) throw new Error('workflow add return id is NaN');
				self.injectOp(func, current_id);
				result_id.push(current_id);
				father_id=current_id;
			}
			return result_id;
		}

	})();