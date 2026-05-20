//
//  LiquidGlassTabBarPlugin.swift
//  RealSight
//
//  Native iOS bottom tab bar that floats over the Capacitor WebView.
//  On iOS 26+ it uses the new Liquid Glass material; on iOS 17–25 it
//  falls back to UIBlurEffect.systemThickMaterial which is visually
//  very close.
//
//  Why a native overlay (not a full UITabBarController):
//    - Capacitor renders the React app in a single full-screen WKWebView.
//    - Tearing that apart for a real UITabBarController + per-tab WebViews
//      would be a 2-week refactor.
//    - A native UIView overlay at the bottom gives 99% of the desired
//      visual + haptic feel with ~150 lines of Swift.
//    - Tap events bridge back to JS, which calls React Router to swap
//      the active route. The WebView never reloads.
//
//  JS side: src/plugins/liquid-glass-tab-bar.ts
//
//  Bridge:
//    LiquidGlassTabBar.present({ items: [...], activeIndex }) → adds bar
//    LiquidGlassTabBar.hide() → removes bar
//    LiquidGlassTabBar.setActiveIndex({ index })
//    Listen for 'tabSelected' { index } events
//

import Capacitor
import UIKit

@objc(LiquidGlassTabBarPlugin)
public class LiquidGlassTabBarPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiquidGlassTabBarPlugin"
    public let jsName = "LiquidGlassTabBar"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "present", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hide", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setActiveIndex", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
    ]

    private var tabBarView: LiquidGlassTabBarView?

    @objc func present(_ call: CAPPluginCall) {
        guard let itemsRaw = call.getArray("items", JSObject.self) else {
            call.reject("`items` array required")
            return
        }
        let activeIndex = call.getInt("activeIndex") ?? 0

        let items = itemsRaw.compactMap { dict -> TabItem? in
            guard let title = dict["title"] as? String,
                  let icon = dict["icon"] as? String else { return nil }
            return TabItem(
                title: title,
                icon: icon,
                badge: dict["badge"] as? String
            )
        }

        DispatchQueue.main.async {
            self.removeExistingTabBar()
            guard let window = self.findKeyWindow() else {
                call.reject("Key window not available")
                return
            }
            let bar = LiquidGlassTabBarView(items: items, activeIndex: activeIndex)
            bar.translatesAutoresizingMaskIntoConstraints = false
            bar.onTap = { [weak self] index in
                self?.notifyListeners("tabSelected", data: ["index": index])
            }
            window.addSubview(bar)
            NSLayoutConstraint.activate([
                bar.leadingAnchor.constraint(equalTo: window.leadingAnchor, constant: 12),
                bar.trailingAnchor.constraint(equalTo: window.trailingAnchor, constant: -12),
                bar.bottomAnchor.constraint(equalTo: window.safeAreaLayoutGuide.bottomAnchor, constant: -8),
                bar.heightAnchor.constraint(equalToConstant: 64),
            ])
            self.tabBarView = bar
            call.resolve()
        }
    }

    @objc func hide(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            self.removeExistingTabBar()
            call.resolve()
        }
    }

    @objc func setActiveIndex(_ call: CAPPluginCall) {
        guard let index = call.getInt("index") else {
            call.reject("`index` required")
            return
        }
        DispatchQueue.main.async {
            self.tabBarView?.setActiveIndex(index)
            call.resolve()
        }
    }

    /// Report whether this build can render the native bar. JS callers
    /// use this to decide whether to fall back to the web MobileNav.
    @objc func isAvailable(_ call: CAPPluginCall) {
        var info: [String: Any] = [:]
        info["available"] = true
        if #available(iOS 26.0, *) {
            info["material"] = "liquid-glass"
        } else {
            info["material"] = "blur-fallback"
        }
        if #available(iOS 17.0, *) {
            info["minSatisfied"] = true
        } else {
            info["minSatisfied"] = false
        }
        call.resolve(info)
    }

    private func removeExistingTabBar() {
        tabBarView?.removeFromSuperview()
        tabBarView = nil
    }

    private func findKeyWindow() -> UIWindow? {
        if #available(iOS 15.0, *) {
            return UIApplication.shared.connectedScenes
                .compactMap { $0 as? UIWindowScene }
                .flatMap { $0.windows }
                .first { $0.isKeyWindow }
        }
        return UIApplication.shared.windows.first { $0.isKeyWindow }
    }
}

/// Single tab item passed from JS.
private struct TabItem {
    let title: String
    /// SF Symbol name (e.g. "house.fill", "chart.bar.fill", "person.fill").
    let icon: String
    /// Optional badge text (e.g. "3", "•").
    let badge: String?
}

/// The actual visual component — a glass-effect rounded UIView at the
/// bottom of the screen with a horizontal stack of buttons.
private class LiquidGlassTabBarView: UIView {
    private let items: [TabItem]
    private var buttons: [UIButton] = []
    private var activeIndex: Int

    var onTap: ((Int) -> Void)?

    init(items: [TabItem], activeIndex: Int) {
        self.items = items
        self.activeIndex = max(0, min(activeIndex, items.count - 1))
        super.init(frame: .zero)
        layer.cornerRadius = 26
        layer.cornerCurve = .continuous
        clipsToBounds = true
        layer.shadowOpacity = 0.25
        layer.shadowRadius = 24
        layer.shadowOffset = CGSize(width: 0, height: 8)
        layer.shadowColor = UIColor.black.cgColor
        layer.masksToBounds = false
        setupBackground()
        setupButtons()
    }

    required init?(coder: NSCoder) { fatalError("init(coder:) unused") }

    private func setupBackground() {
        let bgContainer = UIView()
        bgContainer.translatesAutoresizingMaskIntoConstraints = false
        bgContainer.layer.cornerRadius = 26
        bgContainer.layer.cornerCurve = .continuous
        bgContainer.clipsToBounds = true
        addSubview(bgContainer)
        NSLayoutConstraint.activate([
            bgContainer.leadingAnchor.constraint(equalTo: leadingAnchor),
            bgContainer.trailingAnchor.constraint(equalTo: trailingAnchor),
            bgContainer.topAnchor.constraint(equalTo: topAnchor),
            bgContainer.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])

        // iOS 26+ uses the real Liquid Glass material. Older iOS falls
        // back to UIBlurEffect with the thickest material — visually
        // very close in the dark cinematic-bg context.
        if #available(iOS 26.0, *) {
            // Real Liquid Glass — UIGlassEffect added in iOS 26.
            // We add it via UIVisualEffectView with the new effect.
            let effectView = UIVisualEffectView(effect: UIGlassEffect())
            effectView.translatesAutoresizingMaskIntoConstraints = false
            bgContainer.addSubview(effectView)
            pinToEdges(effectView, inside: bgContainer)
        } else {
            // Fallback: thick blur + subtle dark tint to mimic the
            // RealSight glass-card style.
            let effectView = UIVisualEffectView(effect: UIBlurEffect(style: .systemThickMaterialDark))
            effectView.translatesAutoresizingMaskIntoConstraints = false
            bgContainer.addSubview(effectView)
            pinToEdges(effectView, inside: bgContainer)

            let tint = UIView()
            tint.translatesAutoresizingMaskIntoConstraints = false
            tint.backgroundColor = UIColor(white: 0.06, alpha: 0.4)
            bgContainer.addSubview(tint)
            pinToEdges(tint, inside: bgContainer)
        }

        // Hairline border for the "metal rim" feel
        let border = CALayer()
        border.borderColor = UIColor(white: 1.0, alpha: 0.08).cgColor
        border.borderWidth = 1
        border.cornerRadius = 26
        border.cornerCurve = .continuous
        border.frame = bgContainer.bounds
        layer.addSublayer(border)
        DispatchQueue.main.async {
            border.frame = bgContainer.bounds
        }
    }

    private func setupButtons() {
        let stack = UIStackView()
        stack.axis = .horizontal
        stack.distribution = .fillEqually
        stack.alignment = .center
        stack.spacing = 0
        stack.translatesAutoresizingMaskIntoConstraints = false
        addSubview(stack)
        NSLayoutConstraint.activate([
            stack.leadingAnchor.constraint(equalTo: leadingAnchor),
            stack.trailingAnchor.constraint(equalTo: trailingAnchor),
            stack.topAnchor.constraint(equalTo: topAnchor),
            stack.bottomAnchor.constraint(equalTo: bottomAnchor),
        ])

        for (idx, item) in items.enumerated() {
            let btn = UIButton(type: .system)
            btn.tag = idx
            btn.tintColor = idx == activeIndex
                ? UIColor(red: 0.094, green: 0.84, blue: 0.643, alpha: 1.0)  // #18D6A4
                : UIColor(white: 1.0, alpha: 0.55)
            btn.addTarget(self, action: #selector(tapped(_:)), for: .touchUpInside)

            // Vertical icon + label layout
            var config = UIButton.Configuration.plain()
            config.image = UIImage(systemName: item.icon)
            config.title = item.title
            config.imagePadding = 2
            config.imagePlacement = .top
            var titleAttr = AttributedString(item.title)
            titleAttr.font = .systemFont(ofSize: 10, weight: .semibold)
            config.attributedTitle = titleAttr
            btn.configuration = config

            stack.addArrangedSubview(btn)
            buttons.append(btn)
        }
    }

    func setActiveIndex(_ index: Int) {
        guard index >= 0, index < buttons.count else { return }
        activeIndex = index
        for (idx, btn) in buttons.enumerated() {
            btn.tintColor = idx == index
                ? UIColor(red: 0.094, green: 0.84, blue: 0.643, alpha: 1.0)
                : UIColor(white: 1.0, alpha: 0.55)
        }
    }

    @objc private func tapped(_ sender: UIButton) {
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        setActiveIndex(sender.tag)
        onTap?(sender.tag)
    }

    private func pinToEdges(_ child: UIView, inside parent: UIView) {
        NSLayoutConstraint.activate([
            child.leadingAnchor.constraint(equalTo: parent.leadingAnchor),
            child.trailingAnchor.constraint(equalTo: parent.trailingAnchor),
            child.topAnchor.constraint(equalTo: parent.topAnchor),
            child.bottomAnchor.constraint(equalTo: parent.bottomAnchor),
        ])
    }
}
