// =============================================
// File: src/shared/components/Forbidden.jsx
// Página 403
// =============================================
import React from 'react'
import { Link } from 'react-router-dom'


export default function Forbidden() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center gap-3 p-6 text-center">
            <h1 className="text-3xl font-semibold">403 — Acesso negado</h1>
            <p className="max-w-xl">Você não possui permissão para acessar esta página. Se acredita que isso é um engano, contate um administrador.</p>
            <div className="flex gap-3">
                <Link className="underline" to="/">Ir para a Home</Link>
                <Link className="underline" to="/dashboard">Ir para o Dashboard</Link>
            </div>
        </div>
    )
}