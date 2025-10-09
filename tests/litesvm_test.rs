// cargo test --test litesvm_test -- --no-capture
use litesvm::LiteSVM;
use program_client::accounts::UserDeposit;
use program_client::instructions::{
    Deposit, DepositInstructionArgs, Withdraw, WithdrawInstructionArgs,
};
use program_client::programs::ANCHOR_PROGRAM_ID;
use solana_sdk::{
    native_token::LAMPORTS_PER_SOL,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    transaction::Transaction,
};
use solana_system_interface::program::ID as SYSTEM_PROGRAM_ID;

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

fn setup_test(svm: &mut LiteSVM) -> (Keypair, Pubkey, Pubkey) {
    // Create a payer account
    let payer = Keypair::new();
    svm.airdrop(&payer.pubkey(), LAMPORTS_PER_SOL * 2).unwrap();

    // Derive vault PDA
    let (vault, _bump) = Pubkey::find_program_address(&[b"vault"], &ANCHOR_PROGRAM_ID);

    let (user_deposit, _bump) = Pubkey::find_program_address(
        &[b"user_deposit", payer.pubkey().as_ref()],
        &ANCHOR_PROGRAM_ID,
    );

    (payer, vault, user_deposit)
}

#[test]
fn test_deposit() {
    let mut svm = setup_litesvm();
    let (payer, vault, user_deposit) = setup_test(&mut svm);

    let deposit_amount = LAMPORTS_PER_SOL;

    let deposit_ix = Deposit {
        user: payer.pubkey(),
        user_deposit,
        vault,
        system_program: SYSTEM_PROGRAM_ID,
    }
    .instruction(DepositInstructionArgs {
        amount: deposit_amount,
    });

    let recent_blockhash = svm.latest_blockhash();
    let deposit_tx = Transaction::new_signed_with_payer(
        &[deposit_ix],
        Some(&payer.pubkey()),
        &[&payer],
        recent_blockhash,
    );
    let result = svm.send_transaction(deposit_tx);
    assert!(result.is_ok(), "Deposit transaction should succeed");

    let user_deposit_account =
        UserDeposit::from_bytes(&svm.get_account(&user_deposit).unwrap().data).unwrap();
    assert_eq!(user_deposit_account.balance, deposit_amount);

    let vault_account = svm.get_account(&vault).unwrap();
    assert_eq!(vault_account.lamports, deposit_amount);

    println!("Deposit balance: {:#?}", user_deposit_account);
}

#[test]
fn test_withdraw() {
    let mut svm = setup_litesvm();
    let (payer, vault, user_deposit) = setup_test(&mut svm);

    let deposit_amount = LAMPORTS_PER_SOL;
    let withdraw_amount = deposit_amount / 2;

    // First deposit some funds
    let deposit_ix = Deposit {
        user: payer.pubkey(),
        user_deposit,
        vault,
        system_program: SYSTEM_PROGRAM_ID,
    }
    .instruction(DepositInstructionArgs {
        amount: deposit_amount,
    });

    let recent_blockhash = svm.latest_blockhash();
    let deposit_tx = Transaction::new_signed_with_payer(
        &[deposit_ix],
        Some(&payer.pubkey()),
        &[&payer],
        recent_blockhash,
    );
    svm.send_transaction(deposit_tx).unwrap();

    let user_deposit_account =
        UserDeposit::from_bytes(&svm.get_account(&user_deposit).unwrap().data).unwrap();
    assert_eq!(user_deposit_account.balance, deposit_amount);

    // Now test withdrawal
    let withdraw_ix = Withdraw {
        user: payer.pubkey(),
        vault,
        user_deposit,
        system_program: SYSTEM_PROGRAM_ID,
    }
    .instruction(WithdrawInstructionArgs {
        amount: withdraw_amount,
    });

    let recent_blockhash = svm.latest_blockhash();
    let withdraw_tx = Transaction::new_signed_with_payer(
        &[withdraw_ix],
        Some(&payer.pubkey()),
        &[&payer],
        recent_blockhash,
    );

    let result = svm.send_transaction(withdraw_tx);
    assert!(result.is_ok(), "Withdraw transaction should succeed");

    let user_deposit_account =
        UserDeposit::from_bytes(&svm.get_account(&user_deposit).unwrap().data).unwrap();
    assert_eq!(
        user_deposit_account.balance,
        deposit_amount - withdraw_amount
    );

    let vault_account = svm.get_account(&vault).unwrap();
    assert_eq!(vault_account.lamports, deposit_amount - withdraw_amount);

    println!(
        "Remaining balance after withdrawal: {:#?}",
        user_deposit_account
    );
}
