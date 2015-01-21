#!/usr/bin/env python

import os
from setuptools import setup, find_packages

plugin = 'core.server'

package_path = 'realcon.plugin.' + plugin
package_name = package_path.replace('.', '-')

setup(
	name=package_name,
	version='1.0.0',
	description='RealCON server settings plugin.',
	long_description='',
	classifiers=[],
	author='Kim Silkebækken',
	author_email='support@realcon.rocks',
	url='https://github.com/RealCON/' + package_name,
	keywords='',
	include_package_data=True,
	zip_safe=False,
	install_requires=[],
	packages=find_packages(),
	data_files=[(os.path.join('plugin-assets', package_path, os.path.relpath(root, 'public')), [os.path.join(root, f) for f in files]) for root, dirs, files in os.walk('public') if files],
)
