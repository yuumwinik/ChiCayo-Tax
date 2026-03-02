export interface ScriptLine {
    id: string;
    role: 'agent' | 'partner' | 'note';
    text: string;
    isQuickCopy?: boolean;
}

export interface ScriptSection {
    id: string;
    title: string;
    content?: string;
    lines?: ScriptLine[];
}

export interface Script {
    id: string;
    title: string;
    icon: string;
    sections: ScriptSection[];
}

export interface ObjectionHandler {
    title: string;
    rebuttal: string;
}

export interface OneLiner {
    category: string;
    text: string;
}

export interface ProductComparison {
    feature: string;
    communityTax: string;
    localCPA: string;
}

export const TRAINING_CONTENT = {
    company: {
        name: "Community Tax",
        status: "Official Partner for SBTPG, Drake, Pathward, and EPS",
        specialization: "Tax Debt Resolution (Nationwide)",
        yearsInBusiness: "15+ Years",
        role: "The 'Full-Service Resolution Department' for Tax Professionals",
        targetClient: "Owes $7,000+ in IRS or State tax debt",
        coreServices: [
            "Enforcement Protection (Wage Garnishments, Bank Levies, Asset Seizures)",
            "IRS/State Negotiations (Offer in Compromise, Installment Agreements, Penalty Abatement)",
            "Complex Debt Management (Tax Liens, Payroll Tax, Custom Solutions)",
            "Compliance (Back-tax filing to bring clients into good standing)"
        ]
    },
    scripts: [
        {
            id: 'opening_script',
            title: 'Call Introduction (Opening Script)',
            icon: 'IconPhone',
            sections: [
                {
                    id: 'intro',
                    title: 'The Pro Introduction',
                    content: 'How to lead the conversation as an expert.',
                    lines: [
                        { id: 'op1', role: 'agent', text: "Hi, this is [User Name] from Community Tax. I’m calling because we’ve noticed a lot of tax professionals are seeing clients with significant IRS debt this season, and I wanted to make sure you knew how to use the Resolution Extension integrated into your software.", isQuickCopy: true },
                        { id: 'op2', role: 'agent', text: "Do you currently have any clients who owe more than $7,000 to the IRS or State?", isQuickCopy: true },
                        { id: 'op3', role: 'note', text: "✅ If YES: Pivot immediately to the 'Understand Their Practice' section." },
                        { id: 'op4', role: 'note', text: "❌ If NO: Explain the value-add (Free Consultation, Investigation) so they remember you." }
                    ]
                }
            ]
        },
        {
            id: 'onboard_script',
            title: 'Partner Onboarding Call Script (BDR Version)',
            icon: 'IconBriefcase',
            sections: [
                {
                    id: 'intro',
                    title: '1. Reconnecting with Past Partners',
                    content: 'Confirm awareness of the referral program.',
                    lines: [
                        { id: 'i1', role: 'agent', text: "Hello, is this [Partner Name]? This is [User Name] calling from Community Tax — how are you today?", isQuickCopy: true },
                        { id: 'i2', role: 'agent', text: "I don’t mean to call you out of the blue, [Partner Name], but I’m reaching out because I see that you previously opted into our Tax Resolution Referral Program through [SBTPG / Drake / Pathward] — does that ring a bell?", isQuickCopy: true },
                        { id: 'i3', role: 'note', text: "🤔 If Unsure: 'Our partnership allows you to refer clients to us when they owe money to the IRS. We provide a full-service experience without you taking on the liability.'" }
                    ]
                },
                {
                    id: 'qual',
                    title: '2. Qualification Setup',
                    content: 'Explain why we are calling now and the benefits of the account review.',
                    lines: [
                        { id: 'q1', role: 'agent', text: "Great, [Partner Name]. The reason I’m calling today is that we’re reconnecting with all of our partners before the new year to do a quick account review ahead of the upcoming tax season.", isQuickCopy: true },
                        { id: 'q2', role: 'agent', text: "This review helps you better use our tax resolution services for your clients and also gets you registered for additional free benefits, including our CE webinars. Would you be interested in learning more?", isQuickCopy: true }
                    ]
                },
                {
                    id: 'trigger',
                    title: '3. The Gold Standard Trigger Question',
                    lines: [
                        { id: 't1', role: 'agent', text: "The whole idea of the partnership is to give you a simple way to help clients without it eating up YOUR time. When a client owes, you just ask one question: 'Are you going to be able to pay this debt off in full?'", isQuickCopy: true },
                        { id: 't2', role: 'agent', text: "If NO, that's the perfect time to say: 'We partner with a nationwide tax resolution firm called Community Tax. The next step is a free consultation to review your options.'", isQuickCopy: true }
                    ]
                }
            ]
        },
        {
            id: 'discovery_script',
            title: 'Discovery & Need Analysis',
            icon: 'IconActivity',
            sections: [
                {
                    id: 'current-state',
                    title: 'Understanding Their Practice',
                    content: 'Determine if they see the value in resolution.',
                    lines: [
                        { id: 'ds1', role: 'agent', text: "So [Partner Name], when a client comes in and owes $20k, $50k, or more—what’s your current process for helping them?", isQuickCopy: true },
                        { id: 'ds2', role: 'agent', text: "Do you handle the resolution in-house, or do you find yourself having to turn those clients away?", isQuickCopy: true },
                        { id: 'ds3', role: 'note', text: "💡 Key Insight: If they 'turn them away', highlight that they are leaving $350+ on the table per client." }
                    ]
                }
            ]
        },
        {
            id: 'onboarded_non_activated',
            title: 'Follow-up: Onboarded Non Activated',
            icon: 'IconActivity',
            sections: [
                {
                    id: 'touch-base',
                    title: 'The Touch Base Script',
                    lines: [
                        { id: 'tb1', role: 'agent', text: "Hey, how are you? This is [User Name] calling from Community Tax. You spoke with our team back on [Onboarding Date] where we onboarded you into our Partner Program.", isQuickCopy: true },
                        { id: 'tb2', role: 'agent', text: "I’m just calling to touch base and see if you had any clients recently who might have been potential referrals, any questions on how everything works?", isQuickCopy: true },
                        { id: 'tb3', role: 'agent', text: "Just wanted to remind you of that feature available to you through TPG—If there’s any client with an outstanding debt to the IRS over $7,000, you can use the Referral System to send them directly to my team.", isQuickCopy: true },
                        { id: 'tb4', role: 'agent', text: "We’ll call for a Free Consultation, fully investigate the issue, and provide a Resolution Strategy. You stay as their trusted Tax Professional and get updated within the referral portal.", isQuickCopy: true }
                    ]
                }
            ]
        }
    ],
    theProcess: {
        step1: {
            title: "Phase 1: Investigation (Fact-Finding)",
            duration: "~2 Weeks",
            actions: [
                "Pull IRS and/or State transcripts and records",
                "Perform year-by-year transcript analysis",
                "Conduct a detailed financial interview (Income vs Expenses)",
                "Develop a Guaranteed Resolution Strategy"
            ],
            output: "Comprehensive Strategy Call with the Client."
        },
        step2: {
            title: "Phase 2: Resolution / Representation",
            actions: [
                "Take over all IRS/State communication (Power of Attorney)",
                "Stop Wage Garnishments and Bank Levies immediately",
                "Prevent Asset Seizures and stop enforcement actions",
                "Negotiate OIC, Installment Agreements, or Hardship status"
            ]
        }
    },
    compensation: [
        { partner: "SBTPG (Santa Barbara)", amount: "$350 Payout", breakdown: "Total $350 Reward: $150 upon Investigation start + $200 upon Representation moving forward. Standard for TPG integrated users." },
        { partner: "Direct Partner", amount: "$400 Payout", breakdown: "Total $400 Reward: $150 Investigation + $250 Representation. Direct partners may earn more for higher volume cases." },
        { partner: "Refund Advantage / EPS", amount: "12.5% Rev Share", breakdown: "12.5% of total resolution fee. Paid as fees are received." },
        { partner: "Drake Software", amount: "Software Integrated", breakdown: "Direct referral button within Drake. Earn through direct commissions or volume bonuses." }
    ],
    pricing: {
        investigation: {
            standard: "$499 / $549",
            partnerDiscounted: "$349",
            note: "Standard is $499 ($549 for debts > $10k). Partner referrals provide a $200+ discount for the client."
        },
        representation: "Flat fee quoted during the Step 1 Strategy Call based on case complexity."
    },
    faqs: [
        { q: "How does the client pay for the service?", a: "Clients can pay via credit card, ACH, or often through 'Fee-from-Refund' if they have a current year refund pending. We offer flexible payment plans for the resolution phase." },
        { q: "What is the minimum debt requirement?", a: "To ensure the best ROI for the client and the partner, we typically require a minimum of $7,000 in combined IRS or State tax debt." },
        { q: "Is this integrated into Drake Software?", a: "Yes. Look for the 'Tax Resolution' or 'Community Tax' button in the Drake software dashboard to send referrals with one click." }
    ],
    objectionHandlers: [
        {
            title: "The 'I have a local guy' Objection",
            rebuttal: "I completely understand. What many partners found is that local CPAs often don’t have the nationwide scale or dedicated Power of Attorney teams that Community Tax has. We rotate 300+ staff on dedicated IRS practitioner lines for faster results."
        },
        {
            title: "The 'Unsure / Busy Season' Objection",
            rebuttal: "I completely understand—it’s a busy time. The goal is simple: we help you provide a full-service experience without you having to do the extra work or take on the liability of tax resolution."
        }
    ],
    oneLiners: [
        { category: 'Pitch', text: "We monetize the clients you’d normally have to turn away." },
        { category: 'Value', text: "Think of us as your Full-Service Resolution Department." },
        { category: 'Close', text: "Are you going to be able to pay this debt off in full?" }
    ],
    webinars: [
        { date: "Current Month", topic: "Cracking the IRS Notice Code: Client Representation", status: "CE-Accredited" },
        { date: "Next Month", topic: "Federal Tax Liens Unlocked: Priority Battles & Remedies", status: "CE-Accredited" }
    ],
    portals: [
        { name: "Pathward / Refund Advantage", url: "ra.community.tax" },
        { name: "Drake Software", url: "drake.community.tax/signUp" },
        { name: "EPS", url: "eps.community.tax" },
        { name: "Direct Partners", url: "partners.community.tax" }
    ]
};
