type MatatakiUser = { id: number, name: string };
export interface IRedEnvelopeService {
    registerEnvelope(user: MatatakiUser,
        unit: string, amount: string, quantity: number,
        description: string): void;
    grab(user: MatatakiUser): Promise<string[]>;
}