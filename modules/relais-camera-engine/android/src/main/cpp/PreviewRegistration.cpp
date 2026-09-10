#include <fbjni/fbjni.h>
#include <NitroModules/HybridObjectRegistry.hpp>
#include <VisionCamera/JHybridCameraOutputSpec.hpp>

using namespace facebook;
using namespace margelo::nitro;
using namespace margelo::nitro::camera;

struct JRelaisPreviewOutput : jni::JavaClass<JRelaisPreviewOutput, JHybridCameraOutputSpec::JavaPart> {
  static constexpr auto kJavaDescriptor = "Lexpo/modules/relaiscameraengine/RelaisPreviewOutput;";
  static std::shared_ptr<JHybridCameraOutputSpec> create() {
    static const auto constructor = javaClassStatic()->getConstructor<javaobject()>();
    jni::local_ref<JHybridCameraOutputSpec::JavaPart> instance = javaClassStatic()->newObject(constructor);
    return instance->getJHybridCameraOutputSpec();
  }
};

JNIEXPORT jint JNICALL JNI_OnLoad(JavaVM *vm, void *) {
  return jni::initialize(vm, [] {
    // Register the declared Nitro interface name; VisionCamera leaves this abstract output unregistered.
    HybridObjectRegistry::registerHybridObjectConstructor("CameraOutput", [] {
      return JRelaisPreviewOutput::create();
    });
  });
}
