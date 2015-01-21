window.realcon.registerPlugin(
	'realcon.plugin.core.server',
	'Server',
	function(vm, globals, api, addStyle) {
		var $ = globals.$
		var Vue = globals.Vue
		var moment = globals.moment

		addStyle(require('!css!stylus!../styl/plugin.styl'))

		return Vue.extend({
			template: require('template-html!../../views/plugin.jade'),
			data: function() {
				return {
					vars: {},
					originalVars: {},

					teamkill_kick: false,
					teamkill_ban: false,

					spectators: [],
					vips: [],
				}
			},
			ready: function() {
				var vm = this

				// Get all variables
				api.get('vars').done(function(data) {
					vm.vars = data
					vm.originalVars = $.extend({}, data)

					vm.teamkill_kick = vm.vars.teamkill_count_for_kick > 0
					vm.teamkill_ban = vm.vars.teamkill_kick_for_ban > 0
				})

				// Load spectator list
				api.get('spectator').done(function(data) {
					vm.spectators = data.player_names
				})

				// Load VIP list
				api.get('vip').done(function(data) {
					vm.vips = data.player_names
				})

				vm.$watch('teamkill_kick', function(newValue) {
					if (newValue === false) {
						vm.vars.teamkill_count_for_kick = 0
					}
					else {
						vm.vars.teamkill_count_for_kick = 5
					}
				})

				vm.$watch('teamkill_ban', function(newValue) {
					if (newValue === false) {
						vm.vars.teamkill_kick_for_ban = 0
					}
					else {
						vm.vars.teamkill_kick_for_ban = 3
					}
				})
			},
			created: function() {
			},
			methods: {
				applySettings: function() {
					var vm = this
					var changedVars = {}

					Object.keys(vm.vars).forEach(function(key) {
						if (vm.vars[key] === vm.originalVars[key]) {
							return
						}
						changedVars[key] = vm.vars[key]
					})

					api.put('vars', {vars: JSON.stringify(changedVars)}).done(function(data) {
						console.log(data)
					})
				},
				exportConfig: function() {
					var vm = this

					api.get('export').done(function(data) {
						var config = []

						if (vm.vars.pb_enabled) {
							config.push('punkBuster.activate')
						}

						if (vm.vars.ff_enabled) {
							config.push('fairFight.activate')
						}

						$.each(data, function(k, v) {
							var val = vm.vars[k]

							if (val === null) {
								val = ''
							}

							if (typeof val === 'boolean') {
								val = val ? 'True' : 'False'
							}
							else if (typeof val === 'string') {
								val = '"' + val.replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0') + '"'
							}

							config.push('vars.' + v + ' ' + val)
						})

						config = config.sort().join('\n')
						console.log(config)
					})
				},
				addSpectator: function() {
					var vm = this
					var playerName = vm.addSpectatorPlayerName

					api.post('spectator', { player_name: playerName }).fail(function(data) {
						// Action failed, revert change
						vm.spectators.$remove(playerName)

						// TODO display error message
					})

					vm.spectators.push(vm.addSpectatorPlayerName)
					vm.addSpectatorPlayerName = ''
				},
				removeSpectator: function(playerName) {
					var vm = this

					api.delete('spectator', { player_name: playerName }).fail(function(data) {
						// Action failed, revert change
						vm.spectators.push(playerName)

						// TODO display error message
					})
					vm.spectators.$remove(playerName)
				},
				addVip: function() {
					var vm = this
					var playerName = vm.addVipPlayerName

					api.post('vip', { player_name: playerName }).fail(function(data) {
						// Action failed, revert change
						vm.vips.$remove(playerName)

						// TODO display error message
					})

					vm.vips.push(vm.addVipPlayerName)
					vm.addVipPlayerName = ''
				},
				removeVip: function(playerName) {
					var vm = this

					api.delete('vip', { player_name: playerName }).fail(function(data) {
						// Action failed, revert change
						vm.vips.push(playerName)

						// TODO display error message
					})
					vm.vips.$remove(playerName)
				},
			},
			filters: {
				sort: function(val) {
					return val.slice().sort()
				},
			},
		})
	})
