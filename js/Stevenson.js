var Stevenson ={
	/**
	 * Holds the current account information.  
	 */
	Account: {
		authenticated : false,
		branch : '',
		favoriteRepos : [],
		name : '',
		password : '',
		repo : '',
		username : '',
		/**
		 * Clears the account information from the session and local storage
		 */
		clear : function() {
			Stevenson.Account.authenticated = false;
			Stevenson.Account.branch = '';
			Stevenson.Account.favoriteRepos = [];
			Stevenson.Account.name = '';
			Stevenson.Account.password = '';
			Stevenson.Account.repo = '';
			Stevenson.Account.username = '';
			Stevenson.Account.save();
		},
		/**
		 * Loads the account information from Local Storage
		 */
		load : function() {
			var acct = Stevenson.ls.get('Stevenson.repo.Account');
			if(acct != null && acct.authenticated){
				$.extend(Stevenson.Account, acct);
			}
		},
		/**
		 * Saves the account information to Local Storage
		 */
		save : function() {
			Stevenson.ls.set('Stevenson.repo.Account', Stevenson.Account);
		}
	},
	ext: {
		addHookMethod: function(hook, method){
			Stevenson.ext.methods[hook].push(method);
		},
		afterInit: function(afterInit){
			Stevenson.ext.addHookMethod('afterInit', afterInit);
		},
		beforeInit: function(beforeInit){
			Stevenson.ext.addHookMethod('beforeInit', beforeInit);
		},
		getMethods: function(hook){
			return (Stevenson.ext.methods[hook]) ? Stevenson.ext.methods[hook] : [];
		},
		methods : {
			afterInit: [],
			beforeInit: []
		}
	},
	init: function() {
		Stevenson.log.debug("Invoking beforeinit methods");
		$.each(Stevenson.ext.getMethods('beforeInit'), function(index, initMethod) {
			try {
				initMethod();
			} catch (e) {
				Stevenson.log.error('Exception calling method ' + initMethod, e);
			}
		});
		
		Stevenson.log.debug("Loading the global CMS template");
		$.Mustache.load('./templates/cms.html');
		
		Stevenson.log.info('Initializing application');
	
		// Pre-start checks
		if (!localStorage) {
			alert('Your browser is not supported!  Please use a supported browser.');
		}

		// Start up the account
		Stevenson.Account.load();
		Stevenson.repo.layouts = Stevenson.ls.get("Stevenson.repo.layouts");
		
		
		Stevenson.log.debug('Checking to see if need to login');
		if (Stevenson.loginRequired && Stevenson.Account.authenticated == false) {
			$('#login-modal').modal({
				backdrop: 'static',
				keyboard: false,
				show: true
			});
		}else{
			if (Stevenson.Account.authenticated && Stevenson.Account.authenticated == true) {
				Stevenson.log.debug("Adding logged in top section");
				$.Mustache.load('./templates/authentication.html').done(function () {
					$('#top-login').html('');
					$('#top-login').mustache('top-bar', {name: Stevenson.Account.name});
				});
			}
			Stevenson.log.debug("Calling after Init methods");
			$.each(Stevenson.ext.getMethods('afterInit'), function(index, initMethod) {
				try {
					initMethod();
				} catch (e) {
					Stevenson.log.error('Exception calling method ' + initMethod, e);
				}
			});
		}
	},
	log: {
		debug : function() {
			if (typeof console == 'undefined') {
				return;
			}
			console.debug.apply(console, arguments);
		},
		info : function() {
			if (typeof console == 'undefined') {
				return;
			}
			console.info.apply(console, arguments);
		},
		warn : function() {
			if (typeof console == 'undefined') {
				return;
			}
			console.warn.apply(console, arguments);
		},
		error : function() {
			if (typeof console == 'undefined') {
				return;
			}
			console.error.apply(console, arguments);
		}
	},
	/**
	 * Wrapper for localstorage, allows for getting and setting Objects.
	 */
	ls: {
		/**
		 * Gets a value or object from LocalStorage
		 */
		get : function(key) {
			if (localStorage.getItem(key + '.isObj')
					&& localStorage.getItem(key + '.isObj') == "true") {
				return JSON.parse(localStorage.getItem(key));
			} else {
				return localStorage.getItem(key);
			}
		},
		/**
		 * Checks to see if LocalStorage contains a value for the key.
		 */
		has : function(key) {
			return localStorage.hasOwnProperty(key);
		},
		/**
		 * Removes the value for the key from LocalStorage
		 */
		remove : function(key) {
			return localStorage.removeItem(key);
		},
		/**
		 * Persists the value or object into LocalStorage
		 */
		set : function(key, value) {
			var toSet = value;
			if (typeof value == 'object') {
				toSet = JSON.stringify(value);
				localStorage.setItem(key + '.isObj', true);
			} else {
				localStorage.setItem(key + '.isObj', false);
			}
			localStorage.setItem(key, toSet);
		}
	},
	repo: {
		layouts: [],
		getAllFiles: function(options){
			var settings = $.extend({}, {
				success: function(files){},
				error: function(err){}
				}, options);
			
			var gh = Stevenson.repo.getGitHub();
			var repo = gh.getRepo(Stevenson.Account.repo.split('/')[0], Stevenson.Account.repo
					.split('/')[1]);
			repo.getTree(Stevenson.Account.branch + '?recursive=true', function(err, tree) {
				if (err) {
					settings.error(Stevenson.repo.getErrorMessage(err));
				} else {
					settings.success(tree);
				}
			});
		},
		/**
		 * Loads the branches available for the specified repository.
		 */
		getBranches: function(options) {
			var settings = $.extend({}, {
				success: function(branches){},
				error: function(err){},
				repoName: ''
				}, options);
			
			Stevenson.log.debug('Loading branches for repository: '+settings.repoName);
			var gh = Stevenson.repo.getGitHub();
			var repo = gh.getRepo(settings.repoName.split('/')[0],
					settings.repoName.split('/')[1]);
			repo.listBranches(function(err, branches) {
				if (err) {
					settings.error(Stevenson.repo.getErrorMessage(err));
				} else {
					settings.success(branches);
				}
			});
		},
		getErrorMessage : function(err) {
			if(err.request){
				var errObj = JSON.parse(err.request.responseText);
				return errObj.message;
			}else{
				return err;
			}
		},
		getFile: function(options){
			var settings = $.extend({}, {
				success: function(file){},
				error: function(err){}
				}, options);
			
			var gh = Stevenson.repo.getGitHub();
			var repo = gh.getRepo(Stevenson.Account.repo.split('/')[0], Stevenson.Account.repo
					.split('/')[1]);
			repo.read(Stevenson.Account.branch, settings.path, function(err, file) {
				if (err) {
					settings.error(Stevenson.repo.getErrorMessage(err));
				} else {

					var page = new Page(settings.path, file);
					settings.success(page);
				}
			});
		},
		getFiles: function(options){
			var settings = $.extend({}, {
				success: function(files){},
				error: function(err){}
				}, options);
			
			var gh = Stevenson.repo.getGitHub();
			var repo = gh.getRepo(Stevenson.Account.repo.split('/')[0], Stevenson.Account.repo
					.split('/')[1]);
			repo.getTree(Stevenson.Account.branch + '?recursive=true', function(err, tree) {
				if (err) {
					settings.error(Stevenson.repo.getErrorMessage(err));
				} else {
					Stevenson.log.debug("Trying to load files at path: " + settings.path);
					var files = [];
					var folders = [];
					for(var i=0; i < tree.length; i++) {
						var rf = tree[i];
						if(rf.path.indexOf(settings.path) == 0) {
							var name = rf.path;
							if(settings.path != ''){
								name = rf.path.substr(settings.path.length + 1);
							}
							var file = {};
							if(name.indexOf('/') == -1) {
								Stevenson.log.debug("Adding file: " + rf.path);
								file.name = name;
								file.path = rf.path;
								if(file.name == '_config.yaml' || file.name == '_stevenson.json' || file.name == '_layouts'){
									Stevenson.log.debug("Skipping config file: " + rf.path);
									continue;
								}
								
								if(file.name == '') {
									file.name = '..';
									file.type = 'folder-close';
									file.path = rf.path.substr(0, rf.path.lastIndexOf('/'));
									folders.push(file);
								} else if (rf.type == 'blob') {
									file.type = 'file';
									file.size = rf.size;
									file.sha = rf.sha;
									files.push(file);
								} else {
									file.type = 'folder-close';
									folders.push(file);
								};
							} else {
								Stevenson.log.debug("Skipping child file: " + rf.path);
							};
						} else {
							Stevenson.log.debug("Skipping file: " + rf.path);
						};
					}
					settings.success(folders.concat(files));
				};
			});
		},
		getGitHub: function(){
			return new Github({
				username : Stevenson.Account.username,
				password : Stevenson.Account.password,
				auth : "basic"
			});
		},
		getLayouts: function(options) {
			var settings = $.extend({}, {
				success: function(files){},
				error: function(err){}
				}, options);
			
			var gh = Stevenson.repo.getGitHub();
			var repo = gh.getRepo(Stevenson.Account.repo.split('/')[0], Stevenson.Account.repo
					.split('/')[1]);
			repo.getTree(Stevenson.Account.branch + '?recursive=true', function(err, tree) {
				if (err) {
					settings.error(Stevenson.repo.getErrorMessage(err));
				} else {
					Stevenson.log.debug("Trying to load layouts");
					var layouts = [];
					for(var i=0; i < tree.length; i++) {
						var path = "_layouts";
						var rf = tree[i];
						if(rf.path.indexOf(path) == 0) {
							var name = rf.path.substr(path.length + 1);
							name = name.substring(0, name.indexOf('.'));
							layouts.push(name);
						} else {
							Stevenson.log.debug("Skipping file: " + rf.path);
						};
					}
					Stevenson.repo.layouts = layouts;
					Stevenson.ls.set("Stevenson.repo.layouts", layouts);
					settings.success(layouts);
				};
			});
		},
		getRepo: function(options){
			var settings = $.extend({}, {
				success: function(repo){},
				error: function(err){}
				}, options);
			
			var gh = Stevenson.repo.getGitHub(options);
			try{
				var repo = gh.getRepo(options.name.split('/')[0], options.name.split('/')[1]);
				repo.show(function(err, repo) {
					if (err) {
						settings.error(Stevenson.repo.getErrorMessage(err));
					} else {
						settings.success(repo);
					}
				});
			} catch (e){
				settings.error(e.message);
			}
		},
		getRepos: function(options){
			var settings = $.extend({}, {
				success: function(branches){},
				error: function(err){}
				}, options);
			
			var gh = Stevenson.repo.getGitHub(options);
			var user = gh.getUser();
			user.repos(function(err, repos) {
				if (err) {
					settings.error(Stevenson.repo.getErrorMessage(err));
				} else {
					settings.success(repos);
				}
			});
		},
		login: function(options){
			var settings = $.extend({}, {
				success: function(user){},
				error: function(err){}
				}, options);
			var gh = Stevenson.repo.getGitHub();
			var user = gh.getUser();
			user.show(null, function(err, content) {
				if (err) {
					Stevenson.log.debug('Login failed');
					Stevenson.Account.clear();
					settings.error(Stevenson.repo.getErrorMessage(err));
				} else {
					Stevenson.log.debug('Login successsful');
					Stevenson.Account.authenticated = true;
					Stevenson.Account.name = content.name;
					Stevenson.Account.save();
					settings.success(content);
				}
			});
		},
		savePage: function(options){
			var settings = $.extend({}, {
				success: function(user){},
				error: function(err){}
			}, options);
			var gh = Stevenson.repo.getGitHub();
			var repo = gh.getRepo(Stevenson.Account.repo.split('/')[0], Stevenson.Account.repo
					.split('/')[1]);
			repo.write(Stevenson.Account.branch, settings.path, settings.page.content, settings.message, function(err) {
				if (err) {
					Stevenson.log.debug('Failed to save changes');
					Stevenson.Account.clear();
					settings.error(Stevenson.repo.getErrorMessage(err));
				} else {
					Stevenson.log.debug('Changes saved successfully');
					settings.success();
				}
			});
		}
	},
	/**
	 * User interface methods.
	 */
	ui: {
		/**
		 * Handles messages to be displayed to the user.
		 */
		Messages : {
			/**
			 * Display a message to the user
			 */
			displayMessage : function(message) {
				var div = document.createElement("div");
				$(div).html(message);
				$(div).attr('class', 'alert alert-info');
				$('#message-container').append(div);
				$(div).delay(10000).slideUp(400);
			},
			/**
			 * Display an error to the user
			 */
			displayError : function(message) {
				var div = document.createElement("div");
				$(div).html(message);
				$(div).attr('class', 'alert alert-error');
				$('#message-container').append(div);
				$(div).delay(10000).slideUp(400);
			}
		},
		Loader : {
			display : function(message, progress) {
				$('#loading-modal .message').html(message);
				$('#loading-modal .bar').css('width', progress + '%');
				$('#loading-modal').modal({
					backdrop: 'static',
					keyboard: false,
					show: true
				});
			},
			hide : function() {
				$('#loading-modal .message').html('');
				$('#loading-modal .bar').css('width', '0%');
				$('#loading-modal').modal('hide');
			},
			update : function(progress) {
				$('#loading-modal .bar').css('width', progress + '%');
			}
		}
	},
	util: {
		getParameter: function(name){
			// perform all non-document loading here
			var value = '';
			if (window.location.href.indexOf('?') != -1) {
				var qs = window.location.href.split('?')[1].split('#')[0].split('&');
				for ( var i = qs.length - 1; i >= 0; i--) {
					var elem = qs[i].split('=');
					if(elem[0] == name){
						value = elem[1];
						break;
					}
				}
			}
			return value;
		}
	}
};
function Page(path, content) {
	this.path = path;
	this.content = content;
	this.isPost = function() {
		return path.indexOf('_posts') == 0;
	};
	this.getDate = function() {
		if (this.isPost()) {
			var properties = this.getProperties();
			if(properties.date) {
				var parts = properties.date.split('-');
				return new Date(parts[0], parts[1], parts[2]);
			} else {
				return this.getURLDate();
			}
		} else {
			Stevenson.log.warn("Called getDate on non-post");
			return null;
		}
	};
	this.getName = function() {
		var name = this.path.substring(this.path.lastIndexOf("/", 0));
		if (this.isPost()) {
			var parts = name.split('-');
			parts.reverse();
			parts.pop();
			parts.pop();
			parts.pop();
			parts.reverse();
			name = parts.join('-');
		}
		name = name.substring(0,name.lastIndexOf('.'));
		return name;
	};
	this.getPageContent = function(){
		var parts = this.content.split('---');
		if(parts.length == 3){
			return parts[2];
		} else {
			return parts[0];
		}
	};
	this.getProperties = function(){
		var parts = this.content.split('---');
		if(parts.length == 3){
			return YAML.parse(parts[1]);
		} else {
			Stevenson.log.warn('No YAML header found');
		}
	};
	this.getType = function() {
		return this.path.substring(this.path.lastIndexOf('.') + 1);
	};
	this.getURLDate = function() {
		if (this.isPost()) {
			var name = this.path.substring(this.path.lastIndexOf("/") + 1);
			var parts = name.split('-');
			return new Date(parts[0], parts[1], parts[2]);
		} else {
			Stevenson.log.warn("Called getDate on non-post");
			return null;
		}
	};
}
$(document).ready(function(){
	Stevenson.init();
});