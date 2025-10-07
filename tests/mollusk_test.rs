// cargo test --test mollusk_test
use mollusk_svm::Mollusk;
use program_client::instructions::Initialize;
use program_client::programs::ANCHOR_PROGRAM_ID;
use solana_sdk::{
    account::AccountSharedData,
    signature::{Keypair, Signer},
};
use solana_system_interface::program::ID as SYSTEM_PROGRAM_ID;

#[test]
fn test_initialize_with_mollusk() {
    // Create a new Mollusk instance with the program ID and binary path
    let mollusk = Mollusk::new(&ANCHOR_PROGRAM_ID, "target/deploy/anchor_program");

    // Create a payer account
    let payer = Keypair::new();

    // Build instruction using the generated client
    let initialize = Initialize {};
    let instruction = initialize.instruction();

    // Set up accounts for the instruction
    let payer_account = AccountSharedData::new(1_000_000_000, 0, &SYSTEM_PROGRAM_ID);

    // Process and validate the instruction
    let result = mollusk.process_and_validate_instruction(
        &instruction,
        &[(payer.pubkey(), payer_account.into())],
        &[mollusk_svm::result::Check::success()],
    );
    println!("Result: {:#?}", result);
}
