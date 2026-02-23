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
    scripts: [
        {
            id: 'onboard_script',
            title: 'Partner Onboarding Script (Community Tax)',
            icon: 'IconBriefcase',
            sections: [
                {
                    id: 'obj',
                    title: '1. Call Objective',
                    content: 'Introduce tax professionals to the Community Tax Partnership Program. Focus on how they can earn substantial commissions ($350 - $400) by referring clients with $7,000+ IRS/State debt. Build trust as a Santabarbara TPG / Drake / Password / EPS preferred partner.'
                },
                {
                    id: 'opening',
                    title: '2. Professional Opening',
                    lines: [
                        { id: 'o1', role: 'agent', text: "Hey [Partner Name], this is [My Name] calling from the Community Tax dedicated partner team. I noticed you’re a high-volume tax professional in the [Market] area—how’s your tax season wrapping up?", isQuickCopy: true },
                        { id: 'o2', role: 'agent', text: "The reason for my call is straightforward: As a preferred partner for providers like SBTPG and Drake, Community Tax helps tax pros like you monetize the clients you’d normally have to turn away—clients who owe $7,000 or more to the IRS or State.", isQuickCopy: true },
                        { id: 'o3', role: 'note', text: "Key Value: We are their resolution arm. They do the prep, we do the debt. They get the commission." }
                    ]
                },
                {
                    id: 'commission-pitch',
                    title: '3. The $400 Commission Opportunity',
                    lines: [
                        { id: 'cp1', role: 'agent', text: "Our direct partners earn a $400 commission for every qualified referral that onboards for resolution. If you're utilizing the SBTPG integration, it’s a seamless $350 payout directly through your software setup.", isQuickCopy: true },
                        { id: 'cp2', role: 'partner', text: "So I just log the lead and you guys do everything else?" },
                        { id: 'cp3', role: 'agent', text: "Exactly. You provide the name and number of someone who owes $7k+, and our AEs take it from there. You can track the entire status in your real-time portal.", isQuickCopy: true }
                    ]
                }
            ]
        },
        {
            id: 'referral_script',
            title: 'Client Referral Activation (Callback)',
            icon: 'IconUsers',
            sections: [
                {
                    id: 'ref-open',
                    title: 'The Activation Bonus Call',
                    content: 'Targeting existing contacts to find new referrals. You earn a $10 Activation Bonus for every successful new lead logged during these follow-ups.'
                },
                {
                    id: 'ref-script',
                    title: 'The "Friend & Family" Script',
                    lines: [
                        { id: 'ro1', role: 'agent', text: "Hey [Client Name], just checking in on your file. We’ve been seeing a lot of new IRS activity in [Area] lately. Do you have any friends, family, or business associates who are also struggling with back taxes right now?", isQuickCopy: true },
                        { id: 'ro2', role: 'agent', text: "We have a special 'Priority Access' window right now for new referrals who owe $7k+. If you can think of anyone, I can get them a free analysis by our senior team today.", isQuickCopy: true }
                    ]
                }
            ]
        }
    ],
    objectionHandlers: [
        {
            title: "The 'I have a local guy' Objection",
            rebuttal: "I completely understand. Most of our best partners started that way. What they found is that local CPAs often don’t have the nationwide scale or dedicated Power of Attorney teams that Community Tax has. We handle thousands of cases and offer the highest guaranteed referral rate in the industry."
        },
        {
            title: "The 'My clients can't afford resolution' Objection",
            rebuttal: "That's exactly why they need us. The IRS is already taking their money through garnishments or liens. We work to stop those immediately. Plus, our initial analysis is 100% free, so there's zero risk for them to find out their actual options."
        },
        {
            title: "The 'I'll just do it myself' Objection",
            rebuttal: "You certainly can, but would you represent yourself in court? Tax resolution is a specialized legal field. We have Enrolled Agents and Attorneys who deal with these specific officers every day. We often save clients far more than our fee covers."
        },
        {
            title: "The 'How do I know you're legit?' Objection",
            rebuttal: "We are the official resolution partner for SBTPG, Drake, and EPS. These are the giants of the tax industry. They've vetted us so you don't have to. We've resolved over $800M in tax debt."
        }
    ],
    oneLiners: [
        { category: 'Opening', text: "We monetize the clients you’d normally have to turn away." },
        { category: 'Value', text: "We stop the garnishments and liens while you keep the client relationship." },
        { category: 'Urgency', text: "The IRS doesn't wait—neither should your client." },
        { category: 'Trust', text: "The official resolution partner for SBTPG and Drake Software." }
    ],
    productInfo: {
        title: 'Community Tax Brand Secrets',
        debtThreshold: '$7,000+',
        keyPoints: [
            { title: 'The Gold Standard', detail: 'Community Tax is the top-rated nationwide tax resolution firm, serving as the official partner for SBTPG, Drake, and EPS.' },
            { title: 'High-Value Leads', detail: 'Our focus is strictly on clients with $7,000+ in total tax debt (IRS or State).' },
            { title: 'Full Resolution', detail: 'We specialize in OIC (Offer in Compromise), Penalty Abatement, Liens, Garnishments, and Installment Agreements.' },
            { title: 'Seamless Payouts', detail: '$400 for direct partners / $350 for SBTPG software integrated partners.' },
            { title: 'Attorney-Led', detail: 'Cases are handled by licensed Attorneys, CPAs, and Enrolled Agents with full Power of Attorney.' }
        ],
        comparisons: [
            { feature: 'Commission', communityTax: '$350 - $400', localCPA: '$0 - $100' },
            { feature: 'License Type', communityTax: 'JD / CPA / EA', localCPA: 'CPA only' },
            { feature: 'IRS Access', communityTax: 'Dedicated Practitioner Line', localCPA: 'Standard Support' },
            { feature: 'Scale', communityTax: 'Nationwide / 300+ Staff', localCPA: 'Local / 1-5 Staff' }
        ]
    },
    faqs: [
        {
            q: 'What makes Community Tax better than a local CPA?',
            a: 'Scale and Specialization. Local CPAs handle prep; we handle resolution. We have dedicated teams that do nothing but negotiate with the IRS 40 hours a week.'
        },
        {
            q: 'How do I track my $400 payout?',
            a: 'Your Real-Time Partner Portal (this app) shows every stage of your referral, from "Pending" to "Onboarded".'
        },
        {
            q: 'Does it cost the client anything for the call?',
            a: 'No. The initial Consultation and Tax Debt Analysis are 100% free and no-obligation.'
        },
        {
            q: 'Can we help with unfiled taxes?',
            a: 'Absolutely. We help clients get compliant by filing all back years as part of their larger resolution strategy.'
        },
        {
            q: 'What is the SBTPG integration?',
            a: 'If the tax professional uses Santa Barbara TPG for their refund processing, they can refer directly through their software dashboard.'
        }
    ],
    callQualityChecklist: [
        "Verified Tax Debt is $7,000+ (IRS or State)",
        "Established trust using SBTPG/Drake Partnership",
        "Confirmed the Partner Payout ($350-$400)",
        "Handled at least one objection professionally",
        "Asked for a specific time for the walkthrough"
    ]
};
