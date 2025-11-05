export const metadata = {
    title: "MM Dashboard",
    description: "Market Maker Realtime Dashboard (Binance Futures)"
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body
                style={{
                    margin: 0,
                    fontFamily: "Inter, Arial, sans-serif",
                    background: "#0a0a0a",
                    color: "#eee",
                }}
            >
                {children}
            </body>
        </html>
    );
}
