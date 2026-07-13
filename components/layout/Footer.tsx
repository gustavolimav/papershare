export function Footer() {
  return (
    <footer className="border-t py-6">
      <p className="text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Papershare. Todos os direitos reservados.
      </p>
    </footer>
  );
}
