import { Store } from 'lucide-react';

/**
 * Ícone do app: monograma geométrico (quadrado arredondado + storefront),
 * no padrão de marca das dashboards corporativas atuais — não é a
 * logomarca do Supernosso (que fica pro material voltado ao cliente final).
 */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-[10px] bg-brand-500 text-white shadow-sm ring-1 ring-black/5"
      style={{ width: size, height: size }}
    >
      <Store style={{ width: size * 0.56, height: size * 0.56 }} strokeWidth={2.25} />
    </span>
  );
}
