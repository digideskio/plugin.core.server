import logging
import simplejson as json

from tornado.gen import coroutine

from lib.plugin import (RealCONPlugin, RealCONPluginBaseHandler, on_event, run_every, require_permission)


class ServerSettingsPlugin(RealCONPlugin):
	'''RealCON server settings plugin
	'''
	__plugin_name__ = 'Server Settings'
	__plugin_author__ = 'Kim Silkebaekken'
	__plugin_email__ = 'kim@silkebaekken.no'
	__plugin_version__ = '1.0.0'
	__plugin_entrypoint__ = 'assets/js/main.bundle.js'
	__plugin_permissions__ = (
		('global.vars_edit', 'Global', 'Edit server vars'),
		('server.spectator_list_edit', 'Server', 'Edit spectator list'),
		('server.vip_list_edit', 'Server', 'Edit VIP list'),
	)

	class ServerSettingsSpectatorHandler(RealCONPluginBaseHandler):
		@coroutine
		def get(self):
			players = yield self.plugin.api.command.spectator_list_list()

			self.write({
				'player_names': players
			})

		@coroutine
		@require_permission('server.spectator_list_edit')
		def post(self):
			player_name = self.get_argument('player_name')
			yield self.plugin.api.command.spectator_list_add(player_name)

			self.write({
				'status': 0,
				'player_name': player_name,
			})

		@coroutine
		@require_permission('server.spectator_list_edit')
		def delete(self):
			player_name = self.get_argument('player_name')
			yield self.plugin.api.command.spectator_list_remove(player_name)

			self.write({
				'status': 0,
				'player_name': player_name,
			})

	class ServerSettingsVipHandler(RealCONPluginBaseHandler):
		@coroutine
		def get(self):
			list_limit = 100
			players = []

			for i in range(0, 10):
				offset = i * list_limit
				player_list = yield self.plugin.api.command.reserved_slots_list_list(offset)
				players += player_list
				if len(player_list) < list_limit:
					break

			self.write({
				'player_names': players
			})

		@coroutine
		@require_permission('server.vip_list_edit')
		def post(self):
			player_name = self.get_argument('player_name')
			yield self.plugin.api.command.reserved_slots_list_add(player_name)

			self.write({
				'status': 0,
				'player_name': player_name,
			})

		@coroutine
		@require_permission('server.vip_list_edit')
		def delete(self):
			player_name = self.get_argument('player_name')
			yield self.plugin.api.command.reserved_slots_list_remove(player_name)

			self.write({
				'status': 0,
				'player_name': player_name,
			})

	class ServerSettingsExportHandler(RealCONPluginBaseHandler):
		@coroutine
		def get(self):
			config_map = yield self.plugin.api.var.get_config_map()

			self.write(config_map)

	class ServerSettingsVarsHandler(RealCONPluginBaseHandler):
		@coroutine
		def get(self):
			vars = yield self.plugin.api.var.get_all()
			vars['pb_enabled'] = yield self.plugin.api.command.punkbuster_is_active()
			vars['ff_enabled'] = yield self.plugin.api.command.fairfight_is_active()
			vars['aggressive_join'] = yield self.plugin.api.command.reserved_slots_list_aggressive_join()

			self.write(vars)

		@coroutine
		@require_permission('global.vars_edit')
		def put(self):
			vars = self.get_argument('vars')
			vars_obj = json.loads(vars)

			# FairFight
			if 'ff_enabled' in vars_obj:
				if vars_obj['ff_enabled']:
					yield self.plugin.api.command.fairfight_activate()
				else:
					yield self.plugin.api.command.fairfight_deactivate()

			# PunkBuster
			if 'pb_enabled' in vars_obj:
				if vars_obj['pb_enabled']:
					yield self.plugin.api.command.punkbuster_activate()
				else:
					# TODO handle punkbuster shutdown if possible
					pass

			# Aggressive join
			if 'aggressive_join' in vars_obj:
				yield self.plugin.api.command.reserved_slots_list_aggressive_join(vars_obj['aggressive_join'])

			# Aggressive join
			if 'admin_password' in vars_obj:
				yield self.plugin.api.command.admin_password(vars_obj['admin_password'])

			exceptions = {}
			updated = {}
			for key, value in vars_obj.items():
				method = getattr(self.plugin.api.var, key, None)
				if not method:
					continue
				try:
					method(value)
					logging.info(value)
					updated[key] = value
				except Exception as e:
					exceptions[key] = [value, e]

			self.write({
				'updated': updated,
				'exceptions': exceptions,
			})

	__plugin_handlers__ = [
		(r'/export', ServerSettingsExportHandler),
		(r'/vars', ServerSettingsVarsHandler),
		(r'/spectator', ServerSettingsSpectatorHandler),
		(r'/vip', ServerSettingsVipHandler),
	]


__plugin__ = ServerSettingsPlugin
