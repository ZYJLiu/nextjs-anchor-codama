#![allow(unexpected_cfgs)]
use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};

declare_id!("SApGwJ3zpvucuQbV1kXdrbeuiBunZ6q48o6xucrSGYR");

#[program]
pub mod anchor_program {
    use super::*;

    pub fn deposit(ctx: Context<VaultAction>, amount: u64) -> Result<()> {
        // Ensure amount exceeds rent-exempt minimum
        require_gt!(
            amount,
            Rent::get()?.minimum_balance(0),
            VaultError::InvalidAmount
        );

        transfer(
            CpiContext::new(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            amount,
        )?;

        ctx.accounts.user_deposit.balance += amount;
        Ok(())
    }

    pub fn withdraw(ctx: Context<VaultAction>, amount: u64) -> Result<()> {
        require_gt!(
            ctx.accounts.user_deposit.balance,
            amount,
            VaultError::InvalidAmount
        );

        // Create PDA signer seeds
        let signer_seeds: &[&[u8]] = &[b"vault", &[ctx.bumps.vault]];

        // Withdraw from vault to user
        transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.user.to_account_info(),
                },
                &[signer_seeds],
            ),
            amount,
        )?;

        ctx.accounts.user_deposit.balance -= amount;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct VaultAction<'info> {
    #[account(mut)]
    pub user: Signer<'info>,
    #[account(
        mut,
        seeds = [b"vault"],
        bump,
    )]
    pub vault: SystemAccount<'info>,
    #[account(
        init_if_needed,
        space = 8 + UserDeposit::INIT_SPACE,
        seeds = [b"user_deposit", user.key().as_ref()],
        payer = user,
        bump,
    )]
    pub user_deposit: Account<'info, UserDeposit>,
    pub system_program: Program<'info, System>,
}

#[account]
#[derive(InitSpace)]
pub struct UserDeposit {
    pub balance: u64,
}

#[error_code]
pub enum VaultError {
    #[msg("Invalid amount")]
    InvalidAmount,
}
