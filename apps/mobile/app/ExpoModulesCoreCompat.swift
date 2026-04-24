import ExpoModulesCore

// Workaround for Xcode 26 compatibility: Constant method not found
extension ModuleDefinition {
  @discardableResult
  public func Constant(_ name: String, _ body: @escaping @autoclosure () -> Any) -> PropertyDefinition {
    return Property(name, body)
  }
}
