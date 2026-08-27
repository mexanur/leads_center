import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Truck Driver Leads Command Center",
  description: "Recruitment CRM & Follow-up Command Center for Truck Driver Leads",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} min-h-full antialiased bg-zinc-100/60 dark:bg-zinc-950`}>
        {children}
        <Toaster
          position="top-right"
          richColors
          closeButton
          expand={false}
          visibleToasts={3}
          duration={2500}
          gap={8}
          toastOptions={{
            classNames: {
              toast:
                "rounded-2xl shadow-xl border font-sans text-xs p-3.5 flex items-center gap-3 backdrop-blur-md transition-all duration-200",
              title: "font-bold text-xs",
              description: "text-[11px] text-zinc-500 font-medium mt-0.5",
              actionButton: "rounded-xl text-xs font-bold",
              cancelButton: "rounded-xl text-xs font-bold",
              closeButton:
                "bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 border border-zinc-200 dark:border-zinc-700 transition-colors shadow-xs",
            },
          }}
        />
      </body>
    </html>
  );
}
