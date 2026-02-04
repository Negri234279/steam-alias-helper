export interface FieldState<Value> {
    value: Value
    error: string | null
    touched: boolean
}

export type FieldKeys<T> = {
    [K in keyof T]: T[K] extends FieldState<any> ? K : never
}[keyof T]

export type FieldValue<T> = T extends FieldState<infer V> ? V : never

export type ErrorMap<T> = {
    [K in FieldKeys<T>]: (v: FieldValue<T[K]>) => string | null
}