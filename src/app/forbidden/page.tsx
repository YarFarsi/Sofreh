import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-24 text-center">
      <h1 className="text-2xl font-bold">دسترسی مجاز نیست</h1>
      <Link className="mt-4 inline-block text-primary" href="/">
        بازگشت
      </Link>
    </main>
  );
}
