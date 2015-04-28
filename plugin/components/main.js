window.realcon.registerPlugin(
	'realcon.plugin.bf4.core.serversettings',
	'Server Settings',
	(globals, api, addStyle) => {
		var $ = globals.$
		var Vue = globals.Vue

		addStyle(require('./main.sass'))

		return Vue.extend({
			template: require('./main.jade'),
			data() {
				return {
					vars: {},
					originalVars: {},

					teamkill_kick: false,
					teamkill_ban: false,

					addSpectatorPlayerName: '',
					spectators: [],

					addVipPlayerName: '',
					vips: [],
				}
			},
			ready() {
				// Get all variables
				api.get('vars').done((data) => {
					this.vars = data
					this.originalVars = $.extend({}, data)

					this.teamkill_kick = this.vars.teamkill_count_for_kick > 0
					this.teamkill_ban = this.vars.teamkill_kick_for_ban > 0
				})

				// Load spectator list
				api.get('spectator').done((data) => this.spectators = data.player_names)

				// Load VIP list
				api.get('vip').done((data) => this.vips = data.player_names)

				this.$watch('teamkill_kick', (newValue) => this.vars.teamkill_count_for_kick = newValue === false ? 0 : 5)
				this.$watch('teamkill_ban', (newValue) => this.vars.teamkill_kick_for_ban = newValue === false ? 0 : 5)
			},
			methods: {
				applySettings() {
					var changedVars = {}

					Object.keys(this.vars).forEach((key) => {
						if (this.vars[key] === this.originalVars[key]) {
							return
						}
						changedVars[key] = this.vars[key]
					})

					api.put('vars', { vars: JSON.stringify(changedVars) }).done((data) => {
						console.debug('Applying settings:', data)
					})
				},
				exportConfig() {
					api.get('export').done((data) => {
						var config = []

						if (this.vars.pb_enabled) {
							config.push('punkBuster.activate')
						}

						if (this.vars.ff_enabled) {
							config.push('fairFight.activate')
						}

						data.forEach((v, k) => {
							var val = this.vars[k]

							if (val === null) {
								val = ''
							}

							if (typeof val === 'boolean') {
								val = val ? 'True' : 'False'
							}
							else if (typeof val === 'string') {
								val = '"' + val.replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0') + '"'
							}

							config.push(`vars.${v} ${val}`)
						})

						config = config.sort().join('\n')
					})
				},
				addSpectator() {
					var playerName = this.addSpectatorPlayerName

					api.post('spectator', { player_name: playerName }).fail(() => {
						// Action failed, revert change
						this.spectators.$remove(playerName)

						// TODO display error message
					})

					this.spectators.push(this.addSpectatorPlayerName)
					this.addSpectatorPlayerName = ''
				},
				removeSpectator(playerName) {
					api.delete('spectator', { player_name: playerName }).fail(() => {
						// Action failed, revert change
						this.spectators.push(playerName)

						// TODO display error message
					})
					this.spectators.$remove(playerName)
				},
				addVip() {
					var playerName = this.addVipPlayerName

					api.post('vip', { player_name: playerName }).fail(() => {
						// Action failed, revert change
						this.vips.$remove(playerName)

						// TODO display error message
					})

					this.vips.push(this.addVipPlayerName)
					this.addVipPlayerName = ''
				},
				removeVip(playerName) {
					api.delete('vip', { player_name: playerName }).fail(() => {
						// Action failed, revert change
						this.vips.push(playerName)

						// TODO display error message
					})
					this.vips.$remove(playerName)
				},
			},
			filters: {
				sort: (val) => {
					// Case-insensitive sort from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
					var map = val.slice().map((e, i) => {
						return {
							index: i,
							value: e.toLowerCase(),
						}
					})

					map.sort((a, b) => +(a.value > b.value) || +(a.value === b.value) - 1)

					return map.map((e) => val[e.index])
				}
			},
		})
	})
