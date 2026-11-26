import { beforeEach, describe, expect, it } from "vitest";
import { criarBanco, type Banco } from "./banco-de-teste";

type Perfil = { id: string; nome: string; papel: string; plano_assinatura: string | null };

describe("perfis: criação automática e papéis", () => {
  let b: Banco;
  beforeEach(async () => {
    b = await criarBanco();
  });

  it("todo usuário novo nasce como membro", async () => {
    const id = await b.criarUsuario("membro@exemplo.com", { nome: "Ana" });
    const { rows } = await b.db.query<Perfil>("select * from public.perfis where id = $1", [id]);
    expect(rows).toHaveLength(1);
    expect(rows[0].papel).toBe("membro");
    expect(rows[0].nome).toBe("Ana");
  });

  it("o e-mail do admin inicial nasce como admin, sem diferenciar maiúsculas", async () => {
    const id = await b.criarUsuario("Contato@EcossistemaVS.com.br");
    const { rows } = await b.db.query<Perfil>("select papel from public.perfis where id = $1", [id]);
    expect(rows[0].papel).toBe("admin");
  });
});

describe("perfis: RLS", () => {
  let b: Banco;
  let admin: string;
  let equipe: string;
  let membroA: string;
  let membroB: string;

  beforeEach(async () => {
    b = await criarBanco();
    admin = await b.criarUsuario("contato@ecossistemavs.com.br");
    equipe = await b.criarUsuario("lola@exemplo.com");
    membroA = await b.criarUsuario("a@exemplo.com", { nome: "A" });
    membroB = await b.criarUsuario("b@exemplo.com", { nome: "B" });
    await b.db.query("update public.perfis set papel = 'equipe' where id = $1", [equipe]);
  });

  const idsVisiveis = (rows: { id: string }[]) => rows.map((r) => r.id).sort();

  it("visitante sem login não lê nenhum perfil", async () => {
    await expect(b.comoAnonimo((db) => db.query("select * from public.perfis"))).rejects.toThrow(
      /permission denied/,
    );
  });

  it("membro lê só o próprio perfil", async () => {
    const { rows } = await b.comoUsuario(membroA, (db) => db.query<Perfil>("select id from public.perfis"));
    expect(idsVisiveis(rows)).toEqual([membroA]);
  });

  it("equipe e admin leem todos os perfis", async () => {
    const todos = [admin, equipe, membroA, membroB].sort();
    const daEquipe = await b.comoUsuario(equipe, (db) => db.query<Perfil>("select id from public.perfis"));
    const doAdmin = await b.comoUsuario(admin, (db) => db.query<Perfil>("select id from public.perfis"));
    expect(idsVisiveis(daEquipe.rows)).toEqual(todos);
    expect(idsVisiveis(doAdmin.rows)).toEqual(todos);
  });

  it("membro edita nome e WhatsApp do próprio perfil", async () => {
    await b.comoUsuario(membroA, (db) =>
      db.query("update public.perfis set nome = 'Ana Souza', whatsapp = '11999990000' where id = $1", [membroA]),
    );
    const { rows } = await b.db.query<Perfil>("select nome from public.perfis where id = $1", [membroA]);
    expect(rows[0].nome).toBe("Ana Souza");
  });

  it("membro não altera o perfil de outro membro", async () => {
    const r = await b.comoUsuario(membroA, (db) =>
      db.query("update public.perfis set nome = 'invadido' where id = $1", [membroB]),
    );
    expect(r.affectedRows).toBe(0);
    const { rows } = await b.db.query<Perfil>("select nome from public.perfis where id = $1", [membroB]);
    expect(rows[0].nome).toBe("B");
  });

  it("membro não se promove a admin", async () => {
    await expect(
      b.comoUsuario(membroA, (db) => db.query("update public.perfis set papel = 'admin' where id = $1", [membroA])),
    ).rejects.toThrow(/só o admin altera papel/);
  });

  it("membro não muda o próprio plano de assinatura", async () => {
    await expect(
      b.comoUsuario(membroA, (db) =>
        db.query("update public.perfis set plano_assinatura = 'advisor_private' where id = $1", [membroA]),
      ),
    ).rejects.toThrow(/plano de assinatura/);
  });

  it("equipe altera plano de assinatura, mas não papel", async () => {
    await b.comoUsuario(equipe, (db) =>
      db.query("update public.perfis set plano_assinatura = 'advisor' where id = $1", [membroA]),
    );
    const { rows } = await b.db.query<Perfil>("select plano_assinatura from public.perfis where id = $1", [membroA]);
    expect(rows[0].plano_assinatura).toBe("advisor");

    await expect(
      b.comoUsuario(equipe, (db) => db.query("update public.perfis set papel = 'admin' where id = $1", [equipe])),
    ).rejects.toThrow(/só o admin altera papel/);
  });

  it("admin altera papel de qualquer um", async () => {
    await b.comoUsuario(admin, (db) => db.query("update public.perfis set papel = 'equipe' where id = $1", [membroB]));
    const { rows } = await b.db.query<Perfil>("select papel from public.perfis where id = $1", [membroB]);
    expect(rows[0].papel).toBe("equipe");
  });

  it("ninguém insere nem apaga perfis pela API", async () => {
    await expect(
      b.comoUsuario(admin, (db) => db.query("delete from public.perfis where id = $1", [membroA])),
    ).rejects.toThrow(/permission denied/);
    await expect(
      b.comoUsuario(admin, (db) =>
        db.query("insert into public.perfis (id) values ('00000000-0000-0000-0000-000000000001')"),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("o servidor com a chave de serviço altera papel", async () => {
    await b.comoServico((db) => db.query("update public.perfis set papel = 'equipe' where id = $1", [membroA]));
    const { rows } = await b.db.query<Perfil>("select papel from public.perfis where id = $1", [membroA]);
    expect(rows[0].papel).toBe("equipe");
  });
});
