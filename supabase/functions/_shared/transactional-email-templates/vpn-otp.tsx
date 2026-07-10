import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'HalalMiddleman'

interface VpnOtpProps {
  code?: string
}

const VpnOtpEmail = ({ code }: VpnOtpProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Your ${SITE_NAME} verification code: ${code ?? ''}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Verify your visit</Heading>
        <Text style={text}>
          We noticed you're connecting through a VPN or proxy. To keep
          {' '}{SITE_NAME} safe from automated abuse, please confirm you're
          a real person by entering the 6-digit code below.
        </Text>
        <Section style={codeBox}>
          <Text style={codeStyle}>{code ?? '------'}</Text>
        </Section>
        <Text style={muted}>
          This code expires in 10 minutes. If you didn't request it, you can
          safely ignore this email — your account is not affected in any way.
        </Text>
        <Text style={footer}>— The {SITE_NAME} security team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: VpnOtpEmail,
  subject: (data: Record<string, any>) =>
    `${data?.code ?? '------'} is your ${SITE_NAME} verification code`,
  displayName: 'VPN visitor verification code',
  previewData: { code: '482915' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '480px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 16px' }
const text = { fontSize: '14px', color: '#475569', lineHeight: '1.6', margin: '0 0 16px' }
const codeBox = {
  backgroundColor: '#f1f5f9',
  borderRadius: '12px',
  padding: '20px',
  textAlign: 'center' as const,
  margin: '24px 0',
}
const codeStyle = {
  fontSize: '34px',
  fontWeight: 'bold' as const,
  letterSpacing: '10px',
  color: '#0f172a',
  margin: 0,
  fontFamily: 'monospace',
}
const muted = { fontSize: '12px', color: '#94a3b8', lineHeight: '1.5', margin: '16px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '24px 0 0' }
