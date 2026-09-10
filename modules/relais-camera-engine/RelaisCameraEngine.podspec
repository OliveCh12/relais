Pod::Spec.new do |s|
  s.name = 'RelaisCameraEngine'
  s.version = '0.1.0'
  s.summary = 'Relais native capture, gallery integration and remote camera contract'
  s.description = 'Single native camera boundary for the Relais mobile app.'
  s.author = 'Relais'
  s.homepage = 'https://github.com/OliveCh12/relais'
  s.license = { :type => 'Proprietary' }
  s.platforms = { :ios => '16.4' }
  s.source = { :git => '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.dependency 'react-native-webrtc'
  s.swift_version = '5.9'
  s.source_files = 'ios/**/*.{swift,h,m}'
  s.public_header_files = 'ios/RelaisPreviewSource.h'
  s.resource_bundles = { 'RelaisCameraEngineResources' => ['fixtures/capabilities.json'] }
end
