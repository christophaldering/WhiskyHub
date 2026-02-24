import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center">
      <Card className="w-full max-w-md bg-card/50 border-destructive/20">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-destructive" />
            <h1 className="text-2xl font-bold text-foreground">404 Page Not Found</h1>
          </div>
          
          <p className="mt-4 text-sm text-muted-foreground">
            The barrel you are looking for seems to be empty.
          </p>

          <div className="mt-8 flex justify-end">
             <Link href="/tasting" className="text-primary hover:underline">
               Return to Lobby
             </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
