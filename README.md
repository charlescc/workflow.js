###workflow.js
*A clean, composable way to manipulate sequences of values with asynchronous functions.
Multi fork tree structure is recommended*

Dealing with control flow in heavily asynchronous code can be a big challange. Without any helper functions the code can easily degenerate into a christmas tree shape because of the callback of a callback of a callback syndrome.

	asncFunction1(function(err, result) {
	        asncFunction2(function(err, result) {
	            asncFunction3(function(err, result) {
	                asncFunction4(function(err, result) {
	                    asncFunction5(function(err, result) {
	                        // do something useful
	                    })
	                })
	            })
	        })
	    })
With workflow.js this can be written as

	workflow.list([[input1,asncFunction1 (input , callback){
			//with input1 to do thing
			//input = input1
			//to get state:success,failed
			//callback('failed') when state = failed ,woroflow will stop at this Func
			//callback('success') when state = success,workflow will continue execute into next Func
			callback(state);

		}],[input2,asncFunction2(input,callback){
			//with input2 to do thing

			callback(state);
		}],[input3,asncFunction3(input,callback){
			//with input3 to do thing

			callback(state);
		}],[input4,asncFunction4(input,callback){
			//with input4 to do thing

			callback(state);
		}],[input5,asncFunction5(input,pass,callback){
			//with input5 to do thing
			callback(state);
		}]
	]);

if you need to pass some params between asncFunctions,this can be written as

		workflow.list([input1,asncFunction1 (input , callback , pass){

			callback(state,pass1);

		},asncFunction2 (input , callback , pass){
			//with pass = pass1 from asncFunction1
		
			callback(state,pass2);

		},asncFunction3 (input , callback , pass){
			//with pass = pass2 from asncFunction2
			callback(state,pass3);

		}])

now,you maybe think workflow has Complex syntax to use Chain asynchronous function call.However as you have read,Multi fork tree structure with asynchronous function call is more recommended;
workflow uses unique ID to identify every asynchronous function call,you can use this ID to build Multi fork tree structure with asynchronous function call,then this tree will be executed following rule:

* sub node with asynchronous function call will be executed after the parent node is successful
* when the parent node succeed,its sub nodes can be executed with Asynchronous concurrency
* every process(same as asynchronous function call) can inject its own checkpoint funcs,when current process succeed,workflow will check every checkpoint func of current process,if every checkpoint func return true, execution of sub nodes can continue.Otherwise,execution of sub nodes will pause.

####Core API
#####workflow.add(inputParams, [father_id])
Create a process in workflow,which returns workflow allocation of ID

	var currentId=workflow.add(input , fatherId);

The optional `father_id` argument intend to specify to which parent node current process will be add.Then you need to use this currentId to operate this process.

* If `father_id` argument is undefined,workflow will add current processs node to a new root node .(if multi root node exists,workflow can also execute.it is equivalent to execute more than one multi fork tree)


#####workflow.injectOp(func, process_id)
inject specific Operation into node with specific ID,which return bool to show whether to suceed to injectOp.

	var result = workflow.injectOp(function(input , callback , pass){
			//input =input added into process with currentId  
			//pass = argument passed by callback of process with fatherId 
			
			//to do something with input&pass(pass argument of root process is undefined)
			...
			//if(to do something suceed,want workflow to continue execution of sub node)
			callback('success',[pass],[ck_input]);
			//else(to do something fail,want workflow to pause execution of sub nodes )
			callback('failed');
			} , currentId);
	if(result)//true or false			

The injectOp func `input` argument is `input` of process with currentId.
The injectOp func `pass` argument is passed by callback of process with fatherId.
The injectOp func `callback` argument is callback function which execution of workflow will call.And this callback has its own argument:

* `state` equal to 'success' or 'failed' to inform workflow whether to continue execution of sub nodes.
* `pass` equal to any data structure which will be passed to every sub node's  `pass` argument.
* `ck_input` equal to any data structure which will be passed to   `inputs` argument of every checkpoint of current node.

#####workflow.injectCk(func,process_id)
inject specific check Operation into node with specific ID,which return bool to show whether to suceed to injectCk.

	var result = workflow.injectCk(function(inputs){
			//inputs =ck_input passed by callback of injectOp of currentId 

			//to do something ,check ck_input whether to fullfil standard
			...
			//if(checkpoint passed successfully,workflow will continue execution of sub nodes)
			return true;
			//if(checkpoint unpassed Accidentally,workflow will pause execution of sub nodes)
			return false;			
			},currentId);
	if(result)//true or false		

#####workflow.modify(inputParams, checkpoint, process_id, [add])
Modify inputParams&checkpoint of existing node.

	workflow.modify(input , function(inputs){
			//inputs =ck_input passed by callback of injectOp of currentId 

			//to do something ,check ck_input whether to fullfil standard
			...
			//if(checkpoint passed successfully,workflow will continue execution of sub nodes)
			return true;
			//if(checkpoint unpassed Accidentally,workflow will pause execution of sub nodes)
			return false;
		} , process_id);
The optional `add` argument intend to specify whether this modify operation will clean original `input&checkpoint`.if `add` argument equal to `true`,new `input&checkpoint` will append to original `input&checkpoint`.  		
#####workflow.reset()
Reset current workflow,clean and reset every thing.

	workflow.reset();

If current workflow pauses somewhere or is executing right now , Error will be reported	.
#####workflow.execute([process_id], [pass], [callback])
Execute current workflow at some process with process_id.
	
	workflow.execute(start_id , pass , function(id,state,time){
		


		});
The optional `process_id` argument intend to specify root start  process of current workflow.
The optional `pass` argument is passed to the injectOp of root start process.
The optional 'callback' argumetn is the func which all execution of every process of current workflow will call.And this callback has its own argument:

*`id` argument equal to ID of the process whose execution call this callback func. 
*`state` argument equal to `checked`(injectOp succeed,checkpoints all return true)or`unchecked`(injectOp succeed,one of checkpoints returns false)or`unpassed`(injectOp failed)
*`time` argument equal to time spent by execution of current process.

#####workflow.initFlowMax()
Specify the Maximum number of Asynchronous concurrency.if number of current asynchronous function which is waitting for the call of its callback exceeds to Maximum number,then some processs which need to add to execution will wait for sometime until  number of current asynchronous function less than Maximum number.

	workflow.initFlowMax(200);

The original Maximum number of workflow is set to 1000,you can use this func to change. 	
#####workflow.getProcessProgress(process_id)
Query the state of some process using his process_id,which returns process state:`checked`or`unchecked`or`unpassed` 

	workflow.getProcessProgress(exist_id);
If exist_id is invalid,func returns  false.