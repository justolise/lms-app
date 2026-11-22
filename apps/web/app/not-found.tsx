import Link from "next/link";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/button";

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-surface-raised flex items-center justify-center py-16">
      <Container className="max-w-md">
        <div className="bg-surface rounded-2xl border border-border p-8 shadow-sm text-center space-y-6">
          <div className="text-5xl font-extrabold text-primary">404</div>

          <div className="space-y-2">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Page Not Found
            </h1>
            <p className="text-sm text-muted-foreground">
              The page you are looking for does not exist or has been moved.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/catalogue">
              <Button className="w-full sm:w-auto">Browse Catalogue</Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full sm:w-auto">
                Return Home
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}
