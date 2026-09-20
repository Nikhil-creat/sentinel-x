"""Scenario library and risk scoring for the incident-response agents."""

SCENARIOS = {
    "phishing": {"name": "Phishing email", "alert": "User opened a link in an invoice email and downloaded an attachment", "sev": "high", "base": 62, "q": "phishing malicious link credentials", "cnn": "trojan", "file": "invoice_2291.exe", "mitre": "T1566", "summary": "The attachment behaves like a trojan and the sender pattern matches phishing.", "actions": ["Quarantine the email from all mailboxes", "Block the sender domain at the mail gateway", "Revoke the user sessions and force a password reset"]},
    "ransom": {"name": "Ransomware", "alert": "Mass file renames with a new extension on workstation FIN-WS-07", "sev": "crit", "base": 78, "q": "ransomware encrypt files isolate", "cnn": "ransomware", "file": "locker.bin", "mitre": "T1486", "summary": "File behaviour and the binary both point to encryption for impact.", "actions": ["Isolate FIN-WS-07 from the network", "Disable the affected user account", "Snapshot the host for forensics", "Verify the latest offline backup"]},
    "sqli": {"name": "SQL injection", "alert": "UNION SELECT strings in the id parameter of /api/orders", "sev": "crit", "base": 74, "q": "sql injection web logs", "cnn": None, "file": "", "mitre": "T1190", "summary": "The request pattern matches a known injection technique against a public endpoint.", "actions": ["Block the source address at the web application firewall", "Enable a strict rule on /api/orders", "Open a ticket to parameterize the query"]},
    "brute": {"name": "Password spraying", "alert": "480 failed logins across 12 accounts from one address in 3 minutes", "sev": "high", "base": 58, "q": "brute force password spraying", "cnn": None, "file": "", "mitre": "T1110", "summary": "One source is trying common passwords against many accounts.", "actions": ["Rate-limit and block the source address", "Require multi-factor authentication on the targeted accounts", "Notify the account owners"]},
    "beacon": {"name": "Malware beaconing", "alert": "Laptop DEV-LT-22 contacts a rare domain every 60 seconds", "sev": "high", "base": 64, "q": "command and control beaconing rare domain", "cnn": "botnet", "file": "svc-update.dll", "mitre": "T1071", "summary": "Regular timing and a templated binary suggest a bot in contact with its controller.", "actions": ["Sinkhole the domain in DNS", "Isolate DEV-LT-22", "Collect a memory image for analysis"]},
    "deepfake": {"name": "Deepfake payment request", "alert": "Finance received a voice call that sounds like the CEO asking for an urgent transfer", "sev": "high", "base": 60, "q": "deepfake voice social engineering payment", "cnn": None, "file": "", "mitre": "T1566", "summary": "The urgency, the bypass of normal approval and the refusal of a call-back match voice-clone fraud.", "actions": ["Hold the transfer and verify through a second channel", "Alert the finance team about the attempt", "Require two-person approval for all urgent transfers this week"]},
}


def risk_score(base, cnn_conf, rag_score):
    """Base severity plus evidence from the CNN and the knowledge base, capped at 99."""
    return min(99, round(base + 18 * (cnn_conf or 0) + 10 * min(1.0, rag_score * 2)))


def band(risk):
    return "critical" if risk >= 80 else "high" if risk >= 60 else "medium"
