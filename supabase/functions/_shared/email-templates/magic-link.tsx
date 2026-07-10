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
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
}

export const MagicLinkEmail = ({
  siteName,
  confirmationUrl,
}: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your HalalMiddleman login link</Preview>
    <Body style={main}>
      <Container style={container}>
        <div style={logoWrap}>
          <Img src={LOGO_URL} alt="HalalMiddleman" style={logo} />
          <Text style={brandText}>HALALMIDDLEMAN.NET</Text>
        </div>
        <Heading style={h1}>Your login link</Heading>
        <Text style={text}>
          Click the button below to log in to your <strong>HalalMiddleman</strong> account. This link will expire shortly.
        </Text>
        <Button style={button} href={confirmationUrl}>Log In</Button>
        <Text style={footer}>
          If you didn't request this link, you can safely ignore this email.
        </Text>
        <Text style={small}>© HalalMiddleman.net — Halal escrow for crypto traders.</Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const LOGO_URL = 'https://xzfthtemvqlowwiemcdv.supabase.co/storage/v1/object/public/email-assets/logo.ico'
const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const logoWrap = { marginBottom: '24px' }
const logo = { width: '40px', height: '40px', borderRadius: '8px' }
const brandText = { fontSize: '13px', color: '#888888', fontWeight: '600' as const, margin: '8px 0 0', letterSpacing: '0.3px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0a0a0a', margin: '0 0 18px' }
const text = { fontSize: '15px', color: '#444444', lineHeight: '1.6', margin: '0 0 22px' }
const button = { backgroundColor: '#0a8a3a', color: '#ffffff', fontSize: '15px', fontWeight: '600' as const, borderRadius: '12px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const footer = { fontSize: '12px', color: '#999999', margin: '36px 0 0', borderTop: '1px solid #eeeeee', paddingTop: '16px' }
const small = { fontSize: '12px', color: '#999999', margin: '8px 0 0' }
