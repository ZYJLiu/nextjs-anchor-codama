// cargo test --test mollusk_test -- --no-capture
use mollusk_svm::{result::Check, Mollusk};
use program_client::instructions::{
    Deposit, DepositInstructionArgs, Withdraw, WithdrawInstructionArgs,
};
use program_client::programs::ANCHOR_PROGRAM_ID;
use solana_sdk::{
    account::Account,
    native_token::LAMPORTS_PER_SOL,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
};
use solana_system_interface::program::ID as SYSTEM_PROGRAM_ID;

fn setup_mollusk() -> Mollusk {
    Mollusk::new(&ANCHOR_PROGRAM_ID, "target/deploy/anchor_program")
}

fn setup_test_accounts() -> (Keypair, Pubkey, Pubkey, Vec<(Pubkey, Account)>) {
    // Create a payer account
    let payer = Keypair::new();

    // Derive PDAs
    let (vault, _bump) = Pubkey::find_program_address(&[b"vault"], &ANCHOR_PROGRAM_ID);
    let (user_deposit, _bump) = Pubkey::find_program_address(
        &[b"user_deposit", payer.pubkey().as_ref()],
        &ANCHOR_PROGRAM_ID,
    );

    let initial_balance = LAMPORTS_PER_SOL * 2;

    // Initial accounts
    let accounts = vec![
        (
            payer.pubkey(),
            Account {
                lamports: initial_balance,
                data: vec![],
                owner: SYSTEM_PROGRAM_ID,
                executable: false,
                rent_epoch: 0,
            },
        ),
        (
            vault,
            Account {
                lamports: 0,
                data: vec![],
                owner: SYSTEM_PROGRAM_ID,
                executable: false,
                rent_epoch: 0,
            },
        ),
        (
            SYSTEM_PROGRAM_ID,
            Account {
                lamports: 0,
                data: vec![],
                owner: solana_sdk::native_loader::id(),
                executable: true,
                rent_epoch: 0,
            },
        ),
        (
            user_deposit,
            Account {
                lamports: 0,
                data: vec![],
                owner: SYSTEM_PROGRAM_ID,
                executable: false,
                rent_epoch: 0,
            },
        ),
    ];

    (payer, vault, user_deposit, accounts)
}

#[test]
fn test_deposit() {
    let mollusk = setup_mollusk();
    let (payer, vault, user_deposit, accounts) = setup_test_accounts();

    let deposit_amount = LAMPORTS_PER_SOL;

    // Create deposit instruction
    let deposit_ix = Deposit {
        user: payer.pubkey(),
        user_deposit,
        vault,
        system_program: SYSTEM_PROGRAM_ID,
    }
    .instruction(DepositInstructionArgs {
        amount: deposit_amount,
    });

    // Define checks for deposit
    let deposit_amount_bytes = deposit_amount.to_le_bytes();
    let checks = vec![
        Check::success(),
        Check::account(&vault).lamports(deposit_amount).build(),
        Check::account(&user_deposit)
            .owner(&ANCHOR_PROGRAM_ID)
            .data_slice(8, &deposit_amount_bytes) // Check balance field at offset 8
            .build(),
    ];

    // Process and validate
    let result = mollusk.process_and_validate_instruction(&deposit_ix, &accounts, &checks);

    println!("Deposit test passed!");
    println!("Result: {:#?}", result);
}

#[test]
fn test_withdraw() {
    let mollusk = setup_mollusk();
    let (payer, vault, user_deposit, accounts) = setup_test_accounts();

    let deposit_amount = LAMPORTS_PER_SOL;
    let withdraw_amount = deposit_amount / 2;

    // Create instructions
    let deposit_ix = Deposit {
        user: payer.pubkey(),
        user_deposit,
        vault,
        system_program: SYSTEM_PROGRAM_ID,
    }
    .instruction(DepositInstructionArgs {
        amount: deposit_amount,
    });

    let withdraw_ix = Withdraw {
        user: payer.pubkey(),
        vault,
        user_deposit,
        system_program: SYSTEM_PROGRAM_ID,
    }
    .instruction(WithdrawInstructionArgs {
        amount: withdraw_amount,
    });

    // Define checks for each instruction
    let deposit_amount_bytes = deposit_amount.to_le_bytes();
    let checks_after_deposit = vec![
        Check::success(),
        Check::account(&vault).lamports(deposit_amount).build(),
        Check::account(&user_deposit)
            .owner(&ANCHOR_PROGRAM_ID)
            .data_slice(8, &deposit_amount_bytes) // Check balance after deposit
            .build(),
    ];

    let remaining_balance = deposit_amount - withdraw_amount;
    let remaining_balance_bytes = remaining_balance.to_le_bytes();
    let checks_after_withdraw = vec![
        Check::success(),
        Check::account(&vault).lamports(remaining_balance).build(),
        Check::account(&user_deposit)
            .owner(&ANCHOR_PROGRAM_ID)
            .data_slice(8, &remaining_balance_bytes) // Check balance after withdraw
            .build(),
    ];

    // Process instruction chain with validation at each step
    let instruction_and_checks = [
        (&deposit_ix, checks_after_deposit.as_slice()),
        (&withdraw_ix, checks_after_withdraw.as_slice()),
    ];

    // Execute chain (panics if any check fails)
    let result = mollusk.process_and_validate_instruction_chain(&instruction_and_checks, &accounts);

    println!(
        "Withdraw test passed! Final balance: {} lamports",
        remaining_balance
    );
    println!("Result: {:#?}", result);
}
