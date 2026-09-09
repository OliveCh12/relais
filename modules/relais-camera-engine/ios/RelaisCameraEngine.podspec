Pod::Spec.new do |s|
  s.name = 'RelaisCameraEngine'
  s.version = '0.1.0'
  s.summary = 'Relais camera engine contract and explicit foundation stub'
  s.description = 'Single native camera boundary for the Relais mobile app.'
  s.author = 'Relais'
  s.homepage = 'https://example.invalid/relais'
  s.license = { :type => 'Proprietary' }
  s.platforms = { :ios => '16.4' }
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.swift_version = '5.9'
  s.source_files = '**/*.swift'
  s.resource_bundles = { 'RelaisCameraEngineResources' => ['../fixtures/capabilities.json'] }
end
