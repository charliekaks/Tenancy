'use strict';
var secretKey = 'd6F3Efeq';

module.exports = function(Organisation) {
	Organisation.on('dataSourceAttached', function(){
		var overridden = Organisation.create;
		/*
		* Override the create method of organisation to set a common password
		* for the organisation and the admin user. 
		* TODO : Get the password from the user and directly use it to create admin user.
		*/
		Organisation.create = function(data,cb){
			var self = this;
			// setting the password of the user as the creator name as of now.
			// Just a demo to make things working. 
			// TODO: use better alternative for password 
            arguments[0].password = arguments[0].creator;
            return overridden.apply(this, arguments);
		};
	});



	Organisation.observe('after save',function (ctx,next){
		// check if the hook is being called.
		console.log("creating user rolemapping from the organisation");
		// console.log(ctx.Model.app.datasources.mongoDs.connector.getDefaultIdType());

		var ObjectID = ctx.Model.app.datasources.mongoDs.connector.getDefaultIdType();
		var roleMapper = {};

		if (ctx.instance && ctx.isNewInstance) {
			ctx.instance.orgId = ctx.instance.id;
			ctx.instance.password = ctx.instance.creator;
			// make creator and description as undefined as its not requored for
			// the orgUser model. 
			// TODO : Delete the extra params from ctx.instance object.
			ctx.instance.secretAccessKey = secretKey;
			ctx.instance.creator = undefined;
			ctx.instance.description  = undefined;
			// Delete the extra properties associated by ctx.instance
			delete ctx.instance.__dataSource; //
			delete ctx.instance.__strict;
			delete ctx.instance.__persisted;
			/*
		     * From here we create the following 
		     *   a) Create orgUser with the same credentials passed to the organisation
		     *   b) FindOrCreate a orgRole with name as "orgAdmin"
		     *   c) Create a role mapping between the orgUser and the orgRole 
		     *      ie: make the user as admin for the organisation
		     *
		     * @param ctx.instances
		    */
			ctx.Model.app.models.orgUser.create(ctx.instance)
			.then(function(user){ // Get the orgUser
				roleMapper.principalId = user.id;
				return ctx.Model.app.models.Role.findOrCreate(
					{where: {name: 'orgAdmin'}}, // find
          			{name : 'orgAdmin',description:'admin of the organisation'} // or create
				);
			})
			.then(function(role){ // Get the orgRole
				roleMapper.roleId = role[0].id;
				return ctx.Model.app.models.RoleMapping.create(roleMapper);
			})
			.then(function(mapping){ // Create the mapping between orgUser and orgRole
				next();
			})
			.catch(function(error){
				next(error);
			});
		}
	});

	Organisation.disableRemoteMethodByName('find', true);
	Organisation.disableRemoteMethodByName('findOne', true);
	Organisation.disableRemoteMethodByName('upsert', true);
	Organisation.disableRemoteMethodByName('updateAll', true);
	Organisation.disableRemoteMethodByName('confirm', true);
	Organisation.disableRemoteMethodByName('count', true);
	Organisation.disableRemoteMethodByName('exists', true);
	Organisation.disableRemoteMethodByName('resetPassword', true);
	Organisation.disableRemoteMethodByName('login', true);
	Organisation.disableRemoteMethodByName('logout', true);
	Organisation.disableRemoteMethodByName('createChangeStream', true);
	Organisation.disableRemoteMethodByName('findChangeStream', true);
	Organisation.disableRemoteMethodByName('logout', true);

	// Organisation.disableRemoteMethodByName('updateAttributes', false);

	Organisation.disableRemoteMethodByName('__count__accessTokens', false);
	Organisation.disableRemoteMethodByName('__create__accessTokens', false);
	Organisation.disableRemoteMethodByName('__delete__accessTokens', false);
	Organisation.disableRemoteMethodByName('__destroyById__accessTokens', false);
	Organisation.disableRemoteMethodByName('__findById__accessTokens', false);
	Organisation.disableRemoteMethodByName('__get__accessTokens', false);
	Organisation.disableRemoteMethodByName('__updateById__accessTokens', false);
};
