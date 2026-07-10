import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "What is Halal MM?",
    answer: "Halal MM is an automated crypto escrow platform that helps users trade securely by holding funds until deal conditions are completed.",
  },
  {
    question: "How does creating a deal work?",
    answer: "One user creates a deal and selects the cryptocurrency. Both users then choose their roles (sender and receiver). The sender is provided with an invoice to deposit the payment. Once the payment is received and secured by the bot, the receiver delivers the agreed goods or service. After delivery, the sender clicks Release to finalize the transaction, and the receiver provides their payout address to receive the funds.",
  },
  {
    question: "What coins are supported?",
    answer: "Halal MM currently supports Bitcoin, Ethereum, Solana, Litecoin, USDT on Solana, Ethereum, and BSC, plus USDC on Solana and Ethereum.",
  },
  {
    question: "What happens if something goes wrong?",
    answer: "If there is an issue with payment, delivery, or deal progress, users can open a support ticket and staff can review the deal details and transaction history.",
  },
  {
    question: "How fast are deals completed?",
    answer: "Most deals are completed quickly, and many finish in under 15 minutes depending on payment speed, confirmations, and both parties responding promptly.",
  },
];

const FAQSection = () => {
  return (
    <section id="faq" className="border-t border-border py-16 sm:py-24">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-8">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-12">
          {/* Left side - FAQ */}
          <div>
            <p className="mb-3 text-sm text-primary font-medium uppercase tracking-wider">FAQ</p>
            <h2 className="mb-8 sm:mb-10 text-3xl font-bold text-foreground sm:text-5xl tracking-tight">
              Frequently Asked Questions
            </h2>

            <Accordion type="single" collapsible className="space-y-3">
              {faqs.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`item-${i}`}
                  className="rounded-xl border border-border bg-card px-4 sm:px-6"
                >
                  <AccordionTrigger className="text-left text-sm sm:text-base text-foreground hover:no-underline">
                    {faq.question}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground">
                    {faq.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Right side - Phone mockup */}
          <div className="hidden lg:flex items-center justify-center">
            <div className="relative w-72 overflow-hidden rounded-3xl border-2 border-border bg-card shadow-2xl">
              <img
                src="/images/mock.webp"
                alt="HalalMM Dashboard"
                className="w-full object-cover"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
