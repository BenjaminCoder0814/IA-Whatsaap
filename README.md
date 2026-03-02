# Zenith IA x iHelp (WhatsApp)

Pequeno servidor Express para responder ao bloco "Requisição HTTP" do iHelp. Ele recebe a mensagem do cliente, registra o histórico por telefone e devolve um JSON com o texto que deve ser enviado pelo iHelp.

## Requisitos
- Node.js 18+
- Variáveis de ambiente (veja `.env.example`):
  - `PORT` (padrão 3000)
  - `IHELP_TOKEN` (Bearer token do iHelp)
  - `IHELP_CANAL_ID` (canal WhatsApp no iHelp)
  - `IHELP_IA_USER_ID` (id do usuário da IA, para saber que não é humano)
  - `IHELP_API_BASE_SEND` (default `https://api.ihelpchat.com`)
  - `IHELP_API_BASE_V3` (default `https://apiv3.ihelpchat.com`)

## Como rodar local
```bash
npm install
npm run dev
```
O servidor sobe em `http://localhost:3000`.

## Configuração do arquivo .env

Crie um arquivo `.env` na raiz do projeto com o seguinte conteúdo:

```env
IHELP_TOKEN=NOVO_TOKEN_AQUI
IHELP_CANAL_ID=62459c7b4b6d761849fce1ff
IHELP_IA_USER_ID=10933
IHELP_API_BASE=https://apiv3.ihelpchat.com
```

Essas variáveis são usadas para autenticação e integração com a API do IHELP.

**Importante:** Nunca compartilhe seu arquivo `.env` publicamente.

## Rotas
- `GET /` → retorna `Zenith IA online ✅`
- `POST /ihelp` → webhook iHelp
  - aceita apenas `event === "MessageReceive"`
  - ignora mensagens `fromMe === true`
  - ignora `messageType` diferente de `Text`
  - consulta atendimento via `GET {IHELP_API_BASE_V3}/api/v2/customers/{callId}` com cache de 10s
  - se existir humano (usuario.id != IHELP_IA_USER_ID), não responde
  - se não houver humano, gera resposta e envia via `POST {IHELP_API_BASE_SEND}/api/v2/customers/send-message`
  - sempre responde `{ "ok": true }` ao iHelp (status 200)

## Formato esperado do payload
Exemplo atual (iHelp):
```json
{
  "event": "MessageReceive",
  "message": {
    "callId": "...",
    "whatsAppNumber": "551199999999",
    "fromMe": false,
    "messageType": "Text",
    "text": "..."
  }
}
```
Extração:
- mensagem: tenta `message.text | message.body | message.content | mensagem | message | text | input | cliente.mensagem | JSON.stringify(body)`
- telefone: `message.whatsAppNumber | message.phone | message.from | telefone | phone | from | contact | cliente.telefone` (normalizado para dígitos)

## Lógica de resposta (IA inicial)
- Se a mensagem contém "preço" ou "valor": pede CNPJ, cidade/UF e volume aproximado.
- Se contém "lacre" e "caminhão": pergunta se é graneleiro, baú ou carreta.
- Se contém "container" ou "navio": sugere lacre para container e pede destino/urgência.
- Caso contrário: pede aplicação e quantidade aproximada.

## Histórico
- Salva as últimas 20 mensagens por telefone em `./data/conversas/<telefone>.json`
- Estrutura: `{ telefone, historico: [ { role: "cliente" | "ia", text, ts } ] }`
- A pasta `data/conversas` é criada automaticamente ao iniciar.

## Teste rápido com curl (local)
Use um payload similar ao do iHelp (event MessageReceive):
```bash
curl -X POST http://localhost:3000/ihelp \
  -H "Content-Type: application/json" \
  -d '{
        "event":"MessageReceive",
        "message":{
          "callId":"abc123",
          "whatsAppNumber":"551199999999",
          "fromMe":false,
          "messageType":"Text",
          "text":"quero preco de lacre para caminhao graneleiro"
        }
      }'
```
Com token/canal configurados e sem humano no atendimento, a mensagem é enviada via API do iHelp. O webhook responde:
```json
{"ok":true}
```

## Exemplo de payload
```json
{
  "mensagem": "Preciso de lacre para container, envio para Recife",
  "telefone": "5581999998888"
}
```

## Exemplo de retorno
```json
{
  "ok": true
}
```

## Configuração no iHelp (exemplo)
- Método: POST
- URL: `https://SEU_DOMINIO/ihelp`
- Header: `Content-Type: application/json`
- Body: envie a mensagem do cliente na chave `mensagem` e o telefone em `telefone` (se o iHelp permitir variáveis).

## Scripts
- `npm start` → roda com Node
- `npm run dev` → roda com nodemon
