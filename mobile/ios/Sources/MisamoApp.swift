import SwiftUI
import WebKit

@main
struct MisamoApp: App {
    var body: some Scene {
        WindowGroup {
            MisamoWebView()
                .background(Color.white)
                .preferredColorScheme(.light)
        }
    }
}

struct MisamoWebView: UIViewControllerRepresentable {
    func makeUIViewController(context: Context) -> BrowserController { BrowserController() }
    func updateUIViewController(_ controller: BrowserController, context: Context) {}
}

final class BrowserController: UIViewController, WKNavigationDelegate, WKUIDelegate {
    private let home = URL(string: "https://misamo-indol.vercel.app/#home")!
    private var webView: WKWebView!
    private let errorPanel = UIStackView()

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = .all
        webView = WKWebView(frame: .zero, configuration: configuration)
        webView.navigationDelegate = self
        webView.uiDelegate = self
        webView.isOpaque = false
        webView.backgroundColor = .white
        // Let the website handle horizontal navigation and media swipes.
        webView.allowsBackForwardNavigationGestures = false
        webView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(webView)
        NSLayoutConstraint.activate([
            webView.topAnchor.constraint(equalTo: view.safeAreaLayoutGuide.topAnchor),
            webView.bottomAnchor.constraint(equalTo: view.safeAreaLayoutGuide.bottomAnchor),
            webView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            webView.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])
        let message = UILabel()
        message.text = "미사모에 연결하지 못했습니다.\n인터넷 연결을 확인하고 다시 시도해주세요."
        message.numberOfLines = 0
        message.textAlignment = .center
        let retry = UIButton(type: .system)
        retry.setTitle("다시 연결", for: .normal)
        retry.addTarget(self, action: #selector(retryConnection), for: .touchUpInside)
        errorPanel.axis = .vertical
        errorPanel.spacing = 16
        errorPanel.addArrangedSubview(message)
        errorPanel.addArrangedSubview(retry)
        errorPanel.translatesAutoresizingMaskIntoConstraints = false
        errorPanel.isHidden = true
        view.addSubview(errorPanel)
        NSLayoutConstraint.activate([
            errorPanel.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            errorPanel.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 24),
            errorPanel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -24)
        ])
        webView.load(URLRequest(url: home))
    }

    @objc private func retryConnection() {
        errorPanel.isHidden = true
        webView.isHidden = false
        webView.load(URLRequest(url: webView.url ?? home))
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        errorPanel.isHidden = true
        webView.isHidden = false
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!, withError error: Error) {
        guard (error as NSError).code != NSURLErrorCancelled else { return }
        webView.isHidden = true
        errorPanel.isHidden = false
    }

    func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
        if url.scheme == "https", url.host == home.host {
            decisionHandler(.allow)
        } else if navigationAction.navigationType == .linkActivated,
                  ["https", "http", "mailto", "tel"].contains(url.scheme ?? "") {
            UIApplication.shared.open(url)
            decisionHandler(.cancel)
        } else {
            decisionHandler(.cancel)
        }
    }

    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        guard let url = navigationAction.request.url else { return nil }
        if url.scheme == "https", url.host == home.host { webView.load(URLRequest(url: url)) }
        else if ["https", "http"].contains(url.scheme ?? "") { UIApplication.shared.open(url) }
        return nil
    }

    func webView(_ webView: WKWebView, runJavaScriptAlertPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping () -> Void) {
        let alert = UIAlertController(title: "미사모", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "확인", style: .default) { _ in completionHandler() })
        present(alert, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptConfirmPanelWithMessage message: String,
                 initiatedByFrame frame: WKFrameInfo, completionHandler: @escaping (Bool) -> Void) {
        let alert = UIAlertController(title: "미사모", message: message, preferredStyle: .alert)
        alert.addAction(UIAlertAction(title: "취소", style: .cancel) { _ in completionHandler(false) })
        alert.addAction(UIAlertAction(title: "확인", style: .default) { _ in completionHandler(true) })
        present(alert, animated: true)
    }

    func webView(_ webView: WKWebView, runJavaScriptTextInputPanelWithPrompt prompt: String,
                 defaultText: String?, initiatedByFrame frame: WKFrameInfo,
                 completionHandler: @escaping (String?) -> Void) {
        let alert = UIAlertController(title: "미사모", message: prompt, preferredStyle: .alert)
        alert.addTextField { $0.text = defaultText }
        alert.addAction(UIAlertAction(title: "취소", style: .cancel) { _ in completionHandler(nil) })
        alert.addAction(UIAlertAction(title: "확인", style: .default) { _ in completionHandler(alert.textFields?.first?.text ?? "") })
        present(alert, animated: true)
    }
    // iOS provides its native photo/video/file chooser when runOpenPanel is not overridden.
}
