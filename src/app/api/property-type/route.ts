import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function POST(req: NextRequest) {
  try {
    const { address } = await req.json()

    if (!address) {
      return NextResponse.json({ error: 'Address is required' }, { status: 400 })
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an expert on UK property types. Given a UK address, determine if it is most likely a single-family house or a building containing multiple flats/apartments (tenement, block of flats, converted house, etc).

Consider:
- Street names with "Terrace", "Row", "Court", "Mansions", "House" often indicate flats
- Numbers like "1-10" or "166" on main roads in cities like Edinburgh, Glasgow, London often indicate tenement buildings
- Detached addresses in suburbs or rural areas are more likely houses
- Victorian/Georgian buildings in city centres are often converted to flats

Respond with ONLY one word: "house" or "flat"`
        },
        {
          role: 'user',
          content: address
        }
      ],
      max_tokens: 10,
      temperature: 0,
    })

    const response = completion.choices[0]?.message?.content?.toLowerCase().trim()
    const propertyType = response === 'house' ? 'house' : 'flat'

    return NextResponse.json({ propertyType })
  } catch (error) {
    console.error('Error checking property type:', error)
    // Default to asking the user if AI fails
    return NextResponse.json({ propertyType: null })
  }
}
