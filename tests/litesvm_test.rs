use litesvm::LiteSVM;
use program_client::instructions::Initialize;
use program_client::programs::ANCHOR_PROGRAM_ID;
use solana_sdk::{
    signature::{Keypair, Signer},
    transaction::Transaction,
};

fn setup_litesvm() -> LiteSVM {
    // Create a new LiteSVM instance
    let mut svm = LiteSVM::new();

    // Load and deploy program if binary exists
    let program_path = "target/deploy/anchor_program.so";
    if std::path::Path::new(program_path).exists() {
        svm.add_program_from_file(ANCHOR_PROGRAM_ID, program_path)
            .expect("Failed to deploy program");
    }

    svm
}

#[test]
fn test_initialize_with_validation() {
    let mut svm = setup_litesvm();

    // Create a payer account
    let payer = Keypair::new();
    svm.airdrop(&payer.pubkey(), 1_000_000_000).unwrap();

    // Build instruction using the generated client
    let initialize = Initialize {};
    let instruction = initialize.instruction();

    // Create and send transaction
    let recent_blockhash = svm.latest_blockhash();
    let transaction = Transaction::new_signed_with_payer(
        &[instruction],
        Some(&payer.pubkey()),
        &[&payer],
        recent_blockhash,
    );

    // Process the transaction and validate success
    let result = svm.send_transaction(transaction);
    assert!(result.is_ok(), "Transaction should succeed");
}
