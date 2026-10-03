# Domain Model (Conceitual)

Este documento descreve o modelo conceitual alvo. Nem todas as entidades estao implementadas no banco nesta fase.

## Organizacao

- Empresa SST (operadora)
- Cliente
- Estabelecimento
- Contrato
- Servico
- Parcela
- Pagamento

## Pessoas

- Profissional
- Trabalhador

## Nucleo Tecnico SST

- Ambiente
- Setor
- Cargo
- Atividade
- Perigo
- Agente
- Risco
- Exposicao
- Avaliacao
- EPI
- EPC

## Documentos SST

- Documento SST
- PGR
- PCMSO
- LTCAT
- Insalubridade
- Periculosidade
- Relatorio Analitico

## Bibliotecas e Conformidade

- Template de Segmento
- Norma

## Assinatura e Auditoria

- Assinatura
- Audit Log

## Fase 01 (Implementado no Banco)

- Usuario
- Papel de acesso (Role)
- Base para autenticacao

## Fase 02 (Implementado no Banco)

- Professional
- ProfessionalType
- Vinculo opcional User <-> Professional (0..1)
- lastLoginAt em User

## Distincao arquitetural

- User representa identidade de acesso ao sistema.
- Professional representa cadastro operacional SST.
- Nem todo Professional precisa ter User.
- Nem todo User precisa ter Professional.

As demais entidades serao introduzidas incrementalmente em fases futuras.