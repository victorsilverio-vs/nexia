import { beforeEach, describe, expect, it } from "vitest";
import { criarBanco, type Banco } from "./banco-de-teste";

type Dossie = { membro_id: string; status: string; respostas: Record<string, unknown>; enviado_em: string | null };

describe("dossiê: criação, edição, envio e devolução", () => {
  let b: Banco;
  let admin: string;
  let equipe: string;
  let membroA: string;
  let membroB: string;

  const dossieDe = async (id: string) =>
    (await b.db.query<Dossie>("select * from public.dossies where membro_id = $1", [id])).rows[0];

  const aceitarLgpd = (id: string) =>
    b.comoUsuario(id, (db) => db.query("insert into public.consentimentos (tipo, aceito) values ('lgpd', true)"));

  beforeEach(async () => {
    b = await criarBanco();
    admin = await b.criarUsuario("contato@ecossistemavs.com.br");
    equipe = await b.criarUsuario("lola@exemplo.com");
    membroA = await b.criarUsuario("a@exemplo.com", { nome: "A" });
    membroB = await b.criarUsuario("b@exemplo.com", { nome: "B" });
    await b.db.query("update public.perfis set papel = 'equipe' where id = $1", [equipe]);
  });

  it("membro nasce com dossiê em rascunho; admin não tem dossiê", async () => {
    expect((await dossieDe(membroA)).status).toBe("rascunho");
    expect(await dossieDe(admin)).toBeUndefined();
  });

  it("perfil guarda o e-mail em minúsculas", async () => {
    const id = await b.criarUsuario("Fulano@Exemplo.COM");
    const { rows } = await b.db.query<{ email: string }>("select email from public.perfis where id = $1", [id]);
    expect(rows[0].email).toBe("fulano@exemplo.com");
  });

  it("membro lê só o próprio dossiê; equipe lê todos", async () => {
    const doMembro = await b.comoUsuario(membroA, (db) => db.query<Dossie>("select membro_id from public.dossies"));
    expect(doMembro.rows.map((r) => r.membro_id)).toEqual([membroA]);
    const daEquipe = await b.comoUsuario(equipe, (db) => db.query<Dossie>("select membro_id from public.dossies"));
    // 3: a equipe nasceu como membro (ganhou dossiê) e foi promovida depois; as telas filtram por papel.
    expect(daEquipe.rows).toHaveLength(3);
  });

  it("membro salva respostas no próprio rascunho", async () => {
    await b.comoUsuario(membroA, (db) =>
      db.query(`update public.dossies set respostas = '{"pessoa":{"cidade":"Goiânia"}}' where membro_id = $1`, [membroA]),
    );
    expect((await dossieDe(membroA)).respostas).toEqual({ pessoa: { cidade: "Goiânia" } });
  });

  it("membro não edita o dossiê de outro", async () => {
    const r = await b.comoUsuario(membroA, (db) =>
      db.query(`update public.dossies set respostas = '{"x":1}' where membro_id = $1`, [membroB]),
    );
    expect(r.affectedRows).toBe(0);
  });

  it("membro não muda status por UPDATE direto", async () => {
    await expect(
      b.comoUsuario(membroA, (db) =>
        db.query(`update public.dossies set status = 'enviado' where membro_id = $1`, [membroA]),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("equipe não altera respostas do membro", async () => {
    const r = await b.comoUsuario(equipe, (db) =>
      db.query(`update public.dossies set respostas = '{"x":1}' where membro_id = $1`, [membroA]),
    );
    expect(r.affectedRows).toBe(0);
  });

  it("enviar exige aceite de LGPD", async () => {
    await expect(b.comoUsuario(membroA, (db) => db.query("select public.enviar_dossie()"))).rejects.toThrow(/LGPD/);
  });

  it("recusa de LGPD posterior ao aceite também bloqueia o envio", async () => {
    await aceitarLgpd(membroA);
    await b.comoUsuario(membroA, (db) =>
      db.query("insert into public.consentimentos (tipo, aceito) values ('lgpd', false)"),
    );
    await expect(b.comoUsuario(membroA, (db) => db.query("select public.enviar_dossie()"))).rejects.toThrow(/LGPD/);
  });

  it("com LGPD aceita, o envio trava o dossiê", async () => {
    await aceitarLgpd(membroA);
    await b.comoUsuario(membroA, (db) => db.query("select public.enviar_dossie()"));
    const d = await dossieDe(membroA);
    expect(d.status).toBe("enviado");
    expect(d.enviado_em).not.toBeNull();

    const r = await b.comoUsuario(membroA, (db) =>
      db.query(`update public.dossies set respostas = '{"x":1}' where membro_id = $1`, [membroA]),
    );
    expect(r.affectedRows).toBe(0);
    await expect(b.comoUsuario(membroA, (db) => db.query("select public.enviar_dossie()"))).rejects.toThrow(
      /já enviado/,
    );
  });

  it("membro não devolve o próprio dossiê; equipe devolve", async () => {
    await aceitarLgpd(membroA);
    await b.comoUsuario(membroA, (db) => db.query("select public.enviar_dossie()"));

    await expect(
      b.comoUsuario(membroA, (db) => db.query("select public.devolver_dossie($1)", [membroA])),
    ).rejects.toThrow(/só equipe ou admin/);

    await b.comoUsuario(equipe, (db) => db.query("select public.devolver_dossie($1)", [membroA]));
    expect((await dossieDe(membroA)).status).toBe("rascunho");
  });
});

describe("consentimentos", () => {
  let b: Banco;
  let membroA: string;
  let membroB: string;

  beforeEach(async () => {
    b = await criarBanco();
    membroA = await b.criarUsuario("a@exemplo.com");
    membroB = await b.criarUsuario("b@exemplo.com");
  });

  it("registra com data e dono automáticos", async () => {
    await b.comoUsuario(membroA, (db) =>
      db.query("insert into public.consentimentos (tipo, aceito) values ('conexoes', true)"),
    );
    const { rows } = await b.db.query<{ membro_id: string; data: string }>("select * from public.consentimentos");
    expect(rows[0].membro_id).toBe(membroA);
    expect(rows[0].data).toBeTruthy();
  });

  it("membro não registra consentimento em nome de outro nem forja a data", async () => {
    await expect(
      b.comoUsuario(membroA, (db) =>
        db.query("insert into public.consentimentos (membro_id, tipo, aceito) values ($1, 'lgpd', true)", [membroB]),
      ),
    ).rejects.toThrow(/permission denied/);
    await expect(
      b.comoUsuario(membroA, (db) =>
        db.query("insert into public.consentimentos (tipo, aceito, data) values ('lgpd', true, '2020-01-01')"),
      ),
    ).rejects.toThrow(/permission denied/);
  });

  it("histórico não se altera nem se apaga", async () => {
    await b.comoUsuario(membroA, (db) =>
      db.query("insert into public.consentimentos (tipo, aceito) values ('lgpd', true)"),
    );
    await expect(
      b.comoUsuario(membroA, (db) => db.query("update public.consentimentos set aceito = false")),
    ).rejects.toThrow(/permission denied/);
    await expect(b.comoUsuario(membroA, (db) => db.query("delete from public.consentimentos"))).rejects.toThrow(
      /permission denied/,
    );
  });

  it("membro não lê consentimentos de outro", async () => {
    await b.comoUsuario(membroB, (db) =>
      db.query("insert into public.consentimentos (tipo, aceito) values ('lgpd', true)"),
    );
    const { rows } = await b.comoUsuario(membroA, (db) => db.query("select * from public.consentimentos"));
    expect(rows).toHaveLength(0);
  });
});

describe("perfis: colunas do convite", () => {
  it("membro não altera o próprio e-mail nem os dados do convite", async () => {
    const b = await criarBanco();
    const membro = await b.criarUsuario("a@exemplo.com");
    await expect(
      b.comoUsuario(membro, (db) => db.query("update public.perfis set email = 'x@y.com' where id = $1", [membro])),
    ).rejects.toThrow(/só mudam pelo servidor/);
  });
});

describe("notificações", () => {
  it("membro não lê o registro de notificações; equipe lê", async () => {
    const b = await criarBanco();
    const membro = await b.criarUsuario("a@exemplo.com");
    const equipe = await b.criarUsuario("e@exemplo.com");
    await b.db.query("update public.perfis set papel = 'equipe' where id = $1", [equipe]);
    await b.db.query("insert into public.notificacoes (destinatario_id, gatilho) values ($1, 'convite')", [membro]);
    expect((await b.comoUsuario(membro, (db) => db.query("select * from public.notificacoes"))).rows).toHaveLength(0);
    expect((await b.comoUsuario(equipe, (db) => db.query("select * from public.notificacoes"))).rows).toHaveLength(1);
  });
});

describe("anexos do dossiê (storage)", () => {
  let b: Banco;
  let membroA: string;
  let membroB: string;
  let equipe: string;

  const enviarArquivo = (quem: string, caminho: string) =>
    b.comoUsuario(quem, (db) =>
      db.query("insert into storage.objects (bucket_id, name) values ('dossie', $1)", [caminho]),
    );

  beforeEach(async () => {
    b = await criarBanco();
    membroA = await b.criarUsuario("a@exemplo.com");
    membroB = await b.criarUsuario("b@exemplo.com");
    equipe = await b.criarUsuario("e@exemplo.com");
    await b.db.query("update public.perfis set papel = 'equipe' where id = $1", [equipe]);
  });

  it("membro envia arquivo só na própria pasta", async () => {
    await enviarArquivo(membroA, `${membroA}/terreno.jpg`);
    await expect(enviarArquivo(membroA, `${membroB}/invasao.jpg`)).rejects.toThrow(/row-level security/);
  });

  it("depois de enviar o dossiê, não sobe mais anexos", async () => {
    await b.comoUsuario(membroA, (db) =>
      db.query("insert into public.consentimentos (tipo, aceito) values ('lgpd', true)"),
    );
    await b.comoUsuario(membroA, (db) => db.query("select public.enviar_dossie()"));
    await expect(enviarArquivo(membroA, `${membroA}/tarde.jpg`)).rejects.toThrow(/row-level security/);
  });

  it("membro não vê anexos de outro; equipe vê todos", async () => {
    await enviarArquivo(membroA, `${membroA}/a.pdf`);
    await enviarArquivo(membroB, `${membroB}/b.pdf`);
    const vistosPorA = await b.comoUsuario(membroA, (db) => db.query<{ name: string }>("select name from storage.objects"));
    expect(vistosPorA.rows.map((r) => r.name)).toEqual([`${membroA}/a.pdf`]);
    const vistosPelaEquipe = await b.comoUsuario(equipe, (db) => db.query("select name from storage.objects"));
    expect(vistosPelaEquipe.rows).toHaveLength(2);
  });
});
