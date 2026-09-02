import Link from "next/link";

export default function BackButton() {
  return (
    <Link
      href="/"
      aria-label="Voltar para a página inicial"
      className="inline-flex items-center justify-center rounded-full border border-[#b08d57] bg-white px-4 py-2 text-sm font-medium text-[#2b2118] shadow-sm transition hover:bg-[#f3ead9]"
    >
      ←
    </Link>
  );
}
