'use strict';
const loopback =  require('loopback');
const utils = require('loopback-datasource-juggler/lib/utils');
const _ = require('underscore');

module.exports = function(Adverts) {
	Adverts.on('dataSourceAttached',function(obj){
		var originalCreate = Adverts.create;
		/*
		* Override the create mehtod to check for valid user and org
		* Allow if creatorId is same as current user id
		* Allow if orgId is same as current user organisation
		*/
    Adverts.create = function(options){
      var data, callback;
      if (arguments && arguments.length>0) {
        data = arguments[0];
        var possibleCallbackArg = arguments[arguments.length-1];
        if (typeof possibleCallbackArg === 'function') {
          callback = possibleCallbackArg;
        }
      }

      var self = this;

      callback = callback || utils.createPromiseCallback();

	      	// get current context
	      	var currentContext = ctx.options.remoteCtx;
	      	if (currentContext)  {
		        // get current user id
		        var currentUser = currentContext.get('currentUser');
		        // get current user org id
		        var organisation = currentContext.get('organisation');
		        data.orgId = organisation.id; // TODO: probably a related method call will do this for you, so don't need to override?
		        data.creatorId = currentUser.id; // TODO: probably a related method call won't do this for you, so override has some merit
		        return originalCreate.apply(self, arguments);
	    	}
		    else {
		    	return originalCreate.apply(self, arguments);
		    }

	    return callback.promise;
	};
	
	});


	Adverts.observe('before save',function (ctx,next){
		// check if the hook is being called.
		// console.log('before save hook instance of Adverts');
		var mongoDB = Adverts.app.datasources.mongoDB;
 		var ObjectID = mongoDB.connector.getDefaultIdType();

		if (ctx.instance && ctx.isNewInstance) {
			if(ctx.instance.orgId) {
				ctx.instance.orgId = new ObjectID(ctx.instance.orgId);
			}
			if(ctx.instance.creatorId) {
				ctx.instance.creatorId = new ObjectID(ctx.instance.creatorId);
			}
			ctx.instance.createdAt = new Date();
			ctx.instance.modified =  new Date();
		} else {
			ctx.data.modified = new Date();
		}
		next();
	});

	Adverts.validatesPresenceOf('orgId');
	Adverts.validatesPresenceOf('creatorId');
};
