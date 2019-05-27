'use strict';
const loopback =  require('loopback');
const utils = require('loopback-datasource-juggler/lib/utils');
const _ = require('underscore');
var secretKey = 'd6F3Efeq'; 
module.exports = function(OrgUser) {
    OrgUser.on('dataSourceAttached',function(obj){
		var override = OrgUser.create;
		/*
		* Override the create mehtod 
		* And check for the user role and orgID of current user
		* If no accessToken is present check for secretAccessKey
		* Allow organisation admins to create user
		*/
		OrgUser.create = function(credentials,include,options,cb){
			var self = this;
			if (typeof include === 'function') {
				cb = include;
				include = undefined;
			}
			cb = cb || utils.createPromiseCallback();
			// Get the mongodb _id object.
			var error;
			var mongoDB = OrgUser.app.datasources.mongoDB;
 			var ObjectID = mongoDB.connector.getDefaultIdType();
 			// get current context
			var currentContext = options.remoteCtx; 
			console.log(currentContext)
			// get current token
			var accessToken = currentContext.accessToken;
			 // get user roles
			// var roles = currentContext.get('userRoles');
			// get current user org id
			var organisation = currentContext.organisation;
			if(!accessToken){
				console.log(accessToken);
				if(credentials.secretAccessKey  !== secretKey){ 
					// if secretAccessKey does not match 
					// then create is not invoked from organistion
					delete credentials.secretAccessKey;
					error = new Error('Access Denied');
					error.status =401;
					cb(error);
				}
				else{
					Promise.resolve().then(function(){
						override.call(self, credentials, include, cb);
					})
					.catch(cb);
				}
			}
			else{
				/*
				* Check if the user is having admin permisions for the given
				* organisation and the oraganisation id is the same as payload
				*/
				var isAdmin = _.findWhere({name: 'orgAdmin'});
				if(!isAdmin){
					error = new Error('Access Denied');
					error.status =403;
					cb(error);
				}
				else {
					if(!_.isEqual(new ObjectID(credentials.orgId),organisation.id)){
						error = new Error('Incorrect organisation data');
						error.status = 404;
						cb(error);
					}
					else {
						Promise.resolve().then(function(){
							override.call(self, credentials, include, cb);
						})
						.catch(cb);
					}
				}
			}
			return cb.promise;
		};
	});

	
	OrgUser.observe('before save',function (ctx,next){
		// check if the hook is being called.
		// console.log('before save hook instance of orgUser');

		var mongoDB = OrgUser.app.datasources.mongoDB;
 		var ObjectID = mongoDB.connector.getDefaultIdType();
		if (ctx.instance && ctx.isNewInstance) {
			if(ctx.instance.orgId) {
				ctx.instance.orgId = new ObjectID(ctx.instance.orgId);
			}
			ctx.instance.createdAt = new Date();
			ctx.instance.modifiedAt =  new Date();
		} else {
			ctx.instance.modifiedAt = new Date();
		}
		next();
	});

	OrgUser.observe('after save',function(ctx,next){
		if(ctx.instance && ctx.isNewInstance){
			// find or create a role named storeAdmin 
			ctx.Model.app.models.Role.findOrCreate(
				{where: {name: 'storeAdmin'}}, // find
      			{
      				name : 'storeAdmin',
      				description:'admin of the store belonging to a organisation'
      			}
			)
			.then(function(role){ // Get the orgRole
				var roleMapper = {
					roleId : role[0].id,
					principalId : ctx.instance.id
				};
				// Create the mapping between orgUser and orgRole
				return ctx.Model.app.models.RoleMapping.create(roleMapper);
			})
			.then(function(mapping){ 
				next();
			})
			.catch(function(error){
				next(error);
			});
		}
	});

	OrgUser.disableRemoteMethodByName('createChangeStream', true);
	OrgUser.disableRemoteMethodByName('findChangeStream', true);
	OrgUser.disableRemoteMethodByName('updateAll', true);
	OrgUser.disableRemoteMethodByName('confirm', true);
	OrgUser.disableRemoteMethodByName('count', true);
	// OrgUser.disableRemoteMethodByName('find', true);
	OrgUser.disableRemoteMethodByName('findOne', true);
	OrgUser.disableRemoteMethodByName('upsert', true);
	OrgUser.disableRemoteMethodByName('reset', true);

	OrgUser.disableRemoteMethodByName('__count__accessTokens', false);
	OrgUser.disableRemoteMethodByName('__create__accessTokens', false);
	OrgUser.disableRemoteMethodByName('__delete__accessTokens', false);
	OrgUser.disableRemoteMethodByName('__destroyById__accessTokens', false);
	OrgUser.disableRemoteMethodByName('__findById__accessTokens', false);
	OrgUser.disableRemoteMethodByName('__get__accessTokens', false);
	OrgUser.disableRemoteMethodByName('__updateById__accessTokens', false);
};
