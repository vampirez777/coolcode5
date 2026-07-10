/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Confirm your email for HalalMiddleman</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={logoWrap}>
          <Img src={LOGO_URL} alt="HalalMiddleman" style={logo} />
          <Text style={brandText}>HALALMIDDLEMAN.NET</Text>
        </div>
        <Heading style={h1}>Confirm your email</Heading>
        <Text style={text}>
          Welcome to <strong>HalalMiddleman</strong> — your trusted escrow service for safe crypto deals.
        </Text>
        <Text style={text}>
          Please confirm your email address (
          <Link href={`mailto:${recipient}`} style={link}>{recipient}</Link>
          ) to activate your account:
        </Text>
        <Button style={button} href={confirmationUrl}>Verify Email</Button>
        <Text style={footer}>
          If you didn't create an account at HalalMiddleman, you can safely ignore this email.
        </Text>
        <Text style={small}>© HalalMiddleman.net — Halal escrow for crypto traders.</Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const LOGO_URL = 'https://xzfthtemvqlowwiemcdv.supabase.co/storage/v1/object/public/email-assets/logo.ico'
const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const logoWrap = { marginBottom: '24px' }
const logo = { width: '40px', height: '40px', borderRadius: '8px' }
const brandText = { fontSize: '13px', color: '#888888', fontWeight: '600' as const, margin: '8px 0 0', letterSpacing: '0.3px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0a0a0a', margin: '0 0 18px' }
const text = { fontSize: '15px', color: '#444444', lineHeight: '1.6', margin: '0 0 22px' }
const link = { color: '#0a8a3a', textDecoration: 'underline' }
const button = { backgroundColor: '#0a8a3a', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#999999', margin: '36px 0 0', borderTop: '1px solid #eeeeee', paddingTop: '16px' }
const small = { fontSize: '12px', color: '#999999', margin: '8px 0 0' }
